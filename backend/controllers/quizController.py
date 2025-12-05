import os
import uuid
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from .kgController import call_groq_chat, call_openrouter_chat, _extract_json_block

router = APIRouter(prefix='/quiz', tags=["QuizSessions"]) 

# Session file structure (saved under ./tmp/quiz_<attempt_id>.json)
# {
#   attempt_id: str,
#   user_id: str | None,
#   topic: str,
#   source_eval_path: str,   # path to evaluation temp file
#   subtopics: [str],
#   misconception: [str],
#   two_questions: [str],
#   one_question: [str],
#   mcq: {
#     misconception: [{question, options:[...], answer_index, reason}],
#     two_questions: [{...}],
#     one_question: [{...}]
#   },
#   queue: [ { group: 'misconception'|'two_questions'|'one_question', index: int } ],
#   current: { group: str, index: int } | null,
#   answers: [ { group, index, user_answer, correct, reason } ],
#   mistakes: [ { group, index, question, user_answer, correct_answer, reason } ],
#   final: { score: float, guidance: str } | null
# }


def _read_json(path: str) -> Dict[str, Any]:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def _write_json(path: str, data: Dict[str, Any]):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _normalize_python_topics(topics: List[str], topic_title: str) -> List[str]:
    """Map misleading Python subtopic labels to accurate conventions."""
    t = (topic_title or '').lower()
    if 'python' not in t:
        return topics
    out = []
    for s in topics or []:
        if isinstance(s, str) and s.strip().lower() in { 'constant variables', 'constants' }:
            out.append('Constant conventions (UPPER_SNAKE_CASE, typing.Final)')
        else:
            out.append(s)
    return out


def _norm_stem(text: str) -> str:
    return ' '.join((text or '').lower().split())


def _deduplicate_across_groups(mcq: Dict[str, List[Dict[str, Any]]]) -> Dict[str, List[Dict[str, Any]]]:
    """Ensure distinct questions across all groups by normalized stem."""
    seen = set()
    ordered_groups = ['misconception', 'two_questions', 'one_question']
    for g in ordered_groups:
        unique_items: List[Dict[str, Any]] = []
        for it in mcq.get(g, []):
            stem = _norm_stem(it.get('question') or '')
            if not stem or stem in seen:
                continue
            seen.add(stem)
            unique_items.append(it)
        mcq[g] = unique_items[:5]
    return mcq


@router.post('/start')
async def start_session(payload: dict):
    """Start a quiz session using an evaluation temp file produced by /kg/evaluate.
    Input: { eval_file_path: string, user_id?: string }
    Output: { attempt_id, session_file_path }
    """
    eval_path = (payload.get('eval_file_path') or '').strip()
    user_id = (payload.get('user_id') or '').strip() or None
    if not eval_path or not os.path.exists(eval_path):
        raise HTTPException(status_code=400, detail='Valid eval_file_path is required')

    # Reuse an unfinished session for the same evaluation file to reduce tmp churn
    try:
        tmp_dir = os.path.join(os.getcwd(), 'tmp')
        if os.path.isdir(tmp_dir):
            for name in os.listdir(tmp_dir):
                if name.startswith('quiz_') and name.endswith('.json'):
                    sp = os.path.join(tmp_dir, name)
                    try:
                        data = _read_json(sp)
                        if data.get('source_eval_path') == eval_path and not data.get('final'):
                            # Return existing session
                            return { 'attempt_id': data.get('attempt_id'), 'session_file_path': sp }
                    except Exception:
                        continue
    except Exception:
        pass

    eval_data = _read_json(eval_path)
    topic = eval_data.get('topic') or ''
    subtopics = eval_data.get('subtopics') or []
    misconception = _normalize_python_topics(eval_data.get('misconception') or [], topic)
    two_questions = _normalize_python_topics(eval_data.get('two_questions') or [], topic)
    one_question = _normalize_python_topics(eval_data.get('one_question') or [], topic)

    # Prompt Groq to produce 5 MCQs per group
    groq_model = os.getenv('GROQ_GENERATOR_MODEL', 'llama-3.3-70b-versatile')

    def build_mcq_prompt(group_name: str, topics: List[str], avoid_stems: List[str]) -> str:
        base = (
            "You are an assessment generator. Return JSON only.\n"
            f"Group: {group_name}\n"
            "From the following subtopics, generate 5 strict MCQs to test understanding.\n"
            "Rules:\n"
            "- Each MCQ must have: question (string), options (array of 4 concise options), answer_index (0-3 int), reason (short, factual).\n"
            "- Focus on correctness and clarity; penalize common misconceptions.\n"
            "- Keep questions crisp; avoid trick wording.\n"
            "- Avoid repetition: no duplicate or near-duplicate question stems across this group and prior groups.\n"
            "- Prefer coverage breadth: vary the concepts (e.g., do not ask '+=' repeatedly).\n"
        )
        t = (topic or '').lower()
        if 'python' in t and ('variable' in t or 'variables' in t):
            base += (
                "- Python-specific constraints: Do NOT claim Python has language-level 'const' variables.\n"
                "  If asking about constants, frame as conventions (UPPER_SNAKE_CASE) or typing.Final semantics.\n"
                "- When asking about augmented assignment (+=, -=, *=, /=), ensure correct options say '... and assign back to the left operand'.\n"
                "- Avoid generic language-agnostic claims that contradict Python (e.g., 'constant variables cannot be reassigned' without context).\n"
            )
        base += (
            "Return ONLY a JSON object: { items: [{ question, options, answer_index, reason }] }\n"
            f"Subtopics: {json.dumps(topics)}\n"
            f"Avoid these stems (do not paraphrase or repeat): {json.dumps(avoid_stems)}\n"
        )
        return base

    def parse_items(raw: str) -> List[Dict[str, Any]]:
        try:
            cleaned = _extract_json_block(raw)
            data = json.loads(cleaned)
            items = data.get('items') or []
            if isinstance(items, list):
                return items[:5]
            return []
        except Exception:
            return []

    groups = {
        'misconception': misconception,
        'two_questions': two_questions,
        'one_question': one_question,
    }

    mcq: Dict[str, List[Dict[str, Any]]] = { 'misconception': [], 'two_questions': [], 'one_question': [] }

    prev_stems: List[str] = []
    for g, topics in groups.items():
        if not topics:
            mcq[g] = []
            continue
        prompt = build_mcq_prompt(g, topics, prev_stems)
        raw = call_groq_chat(groq_model, prompt)
        items = parse_items(raw)
        mcq[g] = items
        # accumulate stems to avoid in subsequent groups
        prev_stems.extend([_norm_stem((it.get('question') or '')) for it in items])

    # Optional critic+validator passes via OpenRouter using Llama instruct model
    critic_model = os.getenv('OPENROUTER_CRITIC_MODEL', 'meta-llama/llama-3.3-70b-instruct:free')

    def critic_pass(group_name: str, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not items:
            return items
        t = (topic or '').lower()
        rules = ""
        if 'python' in t and ('variable' in t or 'variables' in t):
            rules = (
                "Python-specific rule: Do NOT include claims of language-level constants.\n"
                "If an item asserts 'constant variables cannot be reassigned' without mentioning typing.Final, rewrite to conventions (UPPER_SNAKE_CASE) or typing.Final semantics.\n"
                "Ensure augmented assignment items explicitly say '... and assign back'.\n"
            )
        prompt = (
            "Evaluate the following MCQs for clarity and correctness. Return JSON only.\n"
            "Replace any unclear or incorrect item with a corrected version.\n"
            + rules +
            "Schema: { items: [{ question, options, answer_index, reason }] }\n"
            f"Group: {group_name}\nItems: {json.dumps(items)}\n"
        )
        try:
            raw = call_openrouter_chat(critic_model, prompt)
            cleaned = _extract_json_block(raw)
            data = json.loads(cleaned)
            return (data.get('items') or items)[:5]
        except Exception:
            return items

    for g in list(mcq.keys()):
        mcq[g] = critic_pass(g, mcq[g])

    # Validator pass via Groq (simple sanity)
    def validator_pass(group_name: str, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not items:
            return items
        t = (topic or '').lower()
        rules = ""
        if 'python' in t and ('variable' in t or 'variables' in t):
            rules = (
                "Python validation: No claims of built-in constant variables; use conventions or typing.Final.\n"
                "Augmented assignment items must say '... and assign'. Options must be unambiguous.\n"
            )
        prompt = (
            "Validate the MCQs. If any item is invalid (missing fields, duplicates, ambiguous options), fix it.\n"
            + rules +
            "Return JSON: { items: [{ question, options, answer_index, reason }] }\n"
            f"Group: {group_name}\nItems: {json.dumps(items)}\n"
        )
        try:
            raw = call_groq_chat(groq_model, prompt)
            cleaned = _extract_json_block(raw)
            data = json.loads(cleaned)
            return (data.get('items') or items)[:5]
        except Exception:
            return items

    for g in list(mcq.keys()):
        mcq[g] = validator_pass(g, mcq[g])

    # Local sanitizer for Python-specific fixes (constants and augmented assignment wording)
    def sanitize_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        t = (topic or '').lower()
        out = []
        for it in items:
            qtext = str(it.get('question') or '')
            opts = list(it.get('options') or [])
            ans = int(it.get('answer_index') if it.get('answer_index') is not None else -1)
            reason = str(it.get('reason') or '')
            changed = False
            if 'python' in t and ('variable' in t or 'variables' in t):
                qlow = qtext.lower()
                # Fix constant variable misconceptions
                if ('constant variable' in qlow or 'const ' in qlow or qlow.strip().startswith('const')) and ('typing.final' not in qlow and 'upper_snake' not in qlow and 'upper' not in qlow):
                    qtext = 'In Python, how do you indicate a name should be treated as a constant?'
                    opts = [
                        'Use UPPER_SNAKE_CASE by convention and avoid reassignment',
                        'Declare with the const keyword',
                        'Prefix with @constant decorator',
                        'Store it in __constants__ module'
                    ]
                    ans = 0
                    reason = 'Python has no built-in const; constants are a convention (UPPER_SNAKE_CASE) or via typing.Final.'
                    changed = True
                # Clarify augmented assignment wording
                if '+=' in qtext or any('+= ' in str(o) or '+=' in str(o) for o in opts):
                    # Ensure correct option says add and assign
                    correct_phrase = 'Add right operand to left and assign back'
                    # Rebuild options to be explicit
                    opts = [
                        'Subtract right operand from left and assign back',
                        'Add right operand to left and assign back',
                        'Multiply operands and leave left unchanged',
                        'Divide left by right without assignment'
                    ]
                    ans = 1
                    reason = 'x += y means x = x + y (add and assign).'
                    changed = True
                if '*=' in qtext or any('*=' in str(o) for o in opts):
                    opts = [
                        'Divide left by right and assign back',
                        'Add operands only',
                        'Subtract right from left and assign back',
                        'Multiply left by right and assign back'
                    ]
                    ans = 3
                    reason = 'x *= y means x = x * y (multiply and assign).'
                    changed = True
            out.append({ 'question': qtext, 'options': opts[:4], 'answer_index': ans, 'reason': reason } if changed else it)
        return out

    for g in list(mcq.keys()):
        mcq[g] = sanitize_items(mcq[g])

    # Enforce distinct questions across all groups
    mcq = _deduplicate_across_groups(mcq)

    # Build queue: interleave groups (misconception first, then two_questions, then one_question)
    queue: List[Dict[str, Any]] = []
    for g in ('misconception', 'two_questions', 'one_question'):
        for i in range(len(mcq[g])):
            queue.append({'group': g, 'index': i})

    attempt_id = str(uuid.uuid4())
    tmp_dir = os.path.join(os.getcwd(), 'tmp')
    os.makedirs(tmp_dir, exist_ok=True)
    session_path = os.path.join(tmp_dir, f"quiz_{attempt_id}.json")

    session = {
        'attempt_id': attempt_id,
        'user_id': user_id,
        'topic': topic,
        'source_eval_path': eval_path,
        'subtopics': subtopics,
        'misconception': misconception,
        'two_questions': two_questions,
        'one_question': one_question,
        'mcq': mcq,
        'queue': queue,
        'current': None,
        'answers': [],
        'mistakes': [],
        'history': [],
        'view_index': None,
        'final': None,
    }

    _write_json(session_path, session)
    return { 'attempt_id': attempt_id, 'session_file_path': session_path }


@router.post('/next')
async def next_question(payload: dict):
    """Return the next question in the session and set it as current.
    Input: { session_file_path: string }
    Output: { question: { question, options }, meta: { group, index } }
    """
    session_path = (payload.get('session_file_path') or '').strip()
    if not session_path or not os.path.exists(session_path):
        raise HTTPException(status_code=400, detail='Valid session_file_path is required')

    session = _read_json(session_path)
    queue = session.get('queue') or []
    if not queue:
        return { 'done': True }

    nxt = queue.pop(0)
    session['current'] = nxt
    session['queue'] = queue

    g, idx = nxt['group'], nxt['index']
    items = (session.get('mcq') or {}).get(g) or []
    if idx >= len(items):
        raise HTTPException(status_code=500, detail='Invalid question index')

    q = items[idx]
    # Do not expose answer_index here
    to_user = { 'question': q.get('question'), 'options': q.get('options') }

    # Track history for review navigation
    history = session.get('history') or []
    if not history or history[-1] != nxt:
        history.append(nxt)
    session['history'] = history
    session['view_index'] = len(history) - 1

    _write_json(session_path, session)
    return { 'question': to_user, 'meta': { 'group': g, 'index': idx } }


@router.post('/prev')
async def prev_question(payload: dict):
    """Return the previous question (read-only view) with user's answer if any.
    Input: { session_file_path: string }
    Output: { question: { question, options }, meta: { group, index }, answered?: { user_answer, correct, correct_index, reason }, read_only: true }
    """
    session_path = (payload.get('session_file_path') or '').strip()
    if not session_path or not os.path.exists(session_path):
        raise HTTPException(status_code=400, detail='Valid session_file_path is required')

    session = _read_json(session_path)
    history = session.get('history') or []
    if not history:
        return { 'done': True }
    view_index = session.get('view_index')
    if view_index is None:
        view_index = len(history) - 1
    else:
        view_index = max(0, view_index - 1)
    session['view_index'] = view_index
    marker = history[view_index]
    g, idx = marker['group'], marker['index']
    items = (session.get('mcq') or {}).get(g) or []
    if idx >= len(items):
        raise HTTPException(status_code=500, detail='Invalid history index')
    q = items[idx]
    to_user = { 'question': q.get('question'), 'options': q.get('options') }
    # Find user's answer if any
    answered = None
    for a in (session.get('answers') or []):
        if a.get('group') == g and int(a.get('index')) == idx:
            answered = {
                'user_answer': a.get('user_answer'),
                'correct': a.get('correct'),
                'correct_index': int((q.get('answer_index') if q.get('answer_index') is not None else -1)),
                'reason': a.get('reason'),
            }
            break
    _write_json(session_path, session)
    return { 'question': to_user, 'meta': { 'group': g, 'index': idx }, 'answered': answered, 'read_only': True }


@router.post('/answer')
async def answer_question(payload: dict):
    """Validate the user's answer for the current question, append reasoning via Grok, and mark mistakes.
    Input: { session_file_path: string, answer_index: int }
    Output: { correct: bool, reason: string }
    """
    session_path = (payload.get('session_file_path') or '').strip()
    if not session_path or not os.path.exists(session_path):
        raise HTTPException(status_code=400, detail='Valid session_file_path is required')

    session = _read_json(session_path)
    current = session.get('current')
    if not current:
        raise HTTPException(status_code=400, detail='No active question. Call /quiz/next first.')

    g, idx = current['group'], current['index']
    items = (session.get('mcq') or {}).get(g) or []
    if idx >= len(items):
        raise HTTPException(status_code=500, detail='Invalid question index')

    q = items[idx]
    user_ans = int(payload.get('answer_index'))
    correct_index = int(q.get('answer_index'))
    is_correct = (user_ans == correct_index)

    # Get reasoning via Grok (OpenRouter) for mistakes; for correct answers, use the MCQ reason
    reason = q.get('reason') or ''
    if not is_correct:
        eval_model = os.getenv('OPENROUTER_EVAL_MODEL', 'x-ai/grok-4.1-fast:free')
        prompt = (
            "Explain concisely why the selected option is incorrect and what the correct answer implies."
            " Return a short JSON object: { reason: string }."
            f"\nQuestion: {json.dumps(q.get('question'))}\n"
            f"Options: {json.dumps(q.get('options'))}\n"
            f"Selected index: {user_ans}\nCorrect index: {correct_index}\n"
        )
        extra = {
            'temperature': float(os.getenv('KG_EVAL_TEMPERATURE', '0.1')),
            'response_format': { 'type': 'json_object' },
            'reasoning': { 'effort': os.getenv('KG_REASONING_EFFORT', 'high') },
            'system_message': (
                'You are a strict tutor. Explain succinctly and factually why the chosen option is wrong, '
                'and what the correct option indicates. Return JSON only.'
            ),
        }
        try:
            raw = call_openrouter_chat(eval_model, prompt, extra=extra)
            cleaned = _extract_json_block(raw)
            data = json.loads(cleaned)
            reason = str(data.get('reason') or reason)
        except Exception:
            # Keep original reason if model fails
            pass

    # Record answer
    entry = {
        'group': g,
        'index': idx,
        'user_answer': user_ans,
        'correct': is_correct,
        'reason': reason,
    }
    answers = session.get('answers') or []
    answers.append(entry)
    session['answers'] = answers

    if not is_correct:
        mistakes = session.get('mistakes') or []
        mistakes.append({
            'group': g,
            'index': idx,
            'question': q.get('question'),
            'user_answer': user_ans,
            'correct_answer': correct_index,
            'reason': reason,
        })
        session['mistakes'] = mistakes

    # Clear current; frontend will call /quiz/next to proceed
    session['current'] = None
    _write_json(session_path, session)
    return { 'correct': is_correct, 'reason': reason }


@router.post('/finish')
async def finish_session(payload: dict):
    """Compute final score combining evaluation score (if present) and MCQ correctness.
    Provide specific guidance, a study roadmap, persist summary to user in DB, and cleanup temp files.
    Input: { session_file_path: string }
    Output: { final_score_10, guidance, learning_profile, honest_feedback, roadmap, session_file_path }
    """
    session_path = (payload.get('session_file_path') or '').strip()
    if not session_path or not os.path.exists(session_path):
        raise HTTPException(status_code=400, detail='Valid session_file_path is required')

    session = _read_json(session_path)

    # Pull original evaluation file if available for baseline
    base_final = 0.0
    try:
        eval_path = session.get('source_eval_path')
        if eval_path and os.path.exists(eval_path):
            eval_data = _read_json(eval_path)
            base_final = float(eval_data.get('final_score_10') or 0.0)
    except Exception:
        base_final = 0.0

    total = len(session.get('answers') or [])
    correct = sum(1 for a in (session.get('answers') or []) if a.get('correct'))
    mcq_score_10 = round((correct / max(1, total)) * 10.0, 2)

    final_score = round(0.6 * base_final + 0.4 * mcq_score_10, 2)

    # Guidance: focus on subtopics corresponding to mistakes
    weak_topics = []
    for m in (session.get('mistakes') or []):
        g = m.get('group')
        idx = int(m.get('index'))
        item = ((session.get('mcq') or {}).get(g) or [])
        if idx < len(item):
            # Attempt to infer topic by matching to group arrays
            if g == 'misconception' and idx < len(session.get('misconception') or []):
                weak_topics.append(session['misconception'][idx])
            elif g == 'two_questions' and idx < len(session.get('two_questions') or []):
                weak_topics.append(session['two_questions'][idx])
            elif g == 'one_question' and idx < len(session.get('one_question') or []):
                weak_topics.append(session['one_question'][idx])
    # Build guidance string with specificity about what was correct vs incorrect
    correct_topics = []
    try:
        for a in (session.get('answers') or []):
            g = a.get('group'); idx = int(a.get('index'))
            if a.get('correct'):
                if g == 'misconception' and idx < len(session.get('misconception') or []):
                    correct_topics.append(session['misconception'][idx])
                elif g == 'two_questions' and idx < len(session.get('two_questions') or []):
                    correct_topics.append(session['two_questions'][idx])
                elif g == 'one_question' and idx < len(session.get('one_question') or []):
                    correct_topics.append(session['one_question'][idx])
    except Exception:
        pass
    guidance = (
        ("Strong on: " + ", ".join(sorted(set([t for t in correct_topics if t])))) if correct_topics else ""
    )
    if weak_topics:
        focus_line = "Focus next on: " + ", ".join(sorted(set([w for w in weak_topics if w])))
        guidance = (guidance + ("; " if guidance else "") + focus_line)
    if not guidance:
        guidance = "Solid performance across covered topics."

    # Build a concise learning profile via reasoning model (non-blocking fallback)
    learning_profile = None
    honest_feedback = None
    try:
        eval_model = os.getenv('OPENROUTER_EVAL_MODEL', 'x-ai/grok-4.1-fast:free')
        # Prepare compact summary of answers grouped
        payload_summary = {
            'topic': session.get('topic'),
            'subtopics': session.get('subtopics'),
            'misconception': session.get('misconception'),
            'two_questions': session.get('two_questions'),
            'one_question': session.get('one_question'),
            'answers': session.get('answers'),
            'mistakes': session.get('mistakes'),
            'base_eval_score': base_final,
            'mcq_score_10': mcq_score_10,
        }
        prompt = (
            "Analyze this quiz session outcome and infer the learner's strengths, weaknesses, and focus areas.\n"
            "Be brutally honest but constructive. Prefer Python-specific guidance if applicable.\n"
            "Return ONLY JSON with keys: { learning_profile: { strengths: string[], weaknesses: string[], focus_areas: string[], style_inference: string }, honest_feedback: string }.\n"
            "Heuristics: If answers strongly favor data types/assignment but miss memory allocation or type hinting, call that out explicitly.\n"
            f"Data: {json.dumps(payload_summary)}\n"
        )
        extra = {
            'temperature': float(os.getenv('KG_EVAL_TEMPERATURE', '0.1')),
            'response_format': { 'type': 'json_object' },
            'reasoning': { 'effort': os.getenv('KG_REASONING_EFFORT', 'medium') },
            'system_message': (
                'You are a candid learning analyst. Identify what the learner is good at vs. weak at, '
                'based strictly on provided answers grouped by concept difficulty. Avoid fluff, be specific. '
                'Return JSON only.'
            ),
            'timeout': 25,
        }
        raw = call_openrouter_chat(eval_model, prompt, extra=extra)
        cleaned = _extract_json_block(raw)
        data = json.loads(cleaned)
        learning_profile = data.get('learning_profile')
        honest_feedback = data.get('honest_feedback')
    except Exception:
        # Non-blocking fallback
        learning_profile = {
            'strengths': ['Basic assignment and data types'] if correct >= max(1, total)//2 else [],
            'weaknesses': ['Memory allocation details', 'Type hinting'] if total and correct < total else [],
            'focus_areas': ['Type hinting', 'Mutability vs immutability', 'Scope nuances'],
            'style_inference': 'Tends to recall surface-level definitions better than deeper semantics.'
        }
        honest_feedback = (
            'You handle straightforward facts (like assignments) reasonably, but you struggled with deeper topics '
            'such as scope nuances, memory allocation, and type hinting. Tighten fundamentals beyond definitions.'
        )

    # Build a study roadmap: start with weak topics, then adjacent fundamentals
    roadmap: List[str] = []
    # Prioritize weak topics from subtopics lists
    for w in weak_topics:
        if w and w not in roadmap:
            roadmap.append(w)
    # Add generic adjacent fundamentals depending on topic
    t = (session.get('topic') or '').lower()
    if 'python' in t:
        extra = ['Variable scope and lifetime', 'Mutability vs immutability', 'Type hinting (PEP 484)', 'Data structures performance']
    elif 'javascript' in t or 'js' in t:
        extra = ['Scope (var/let/const)', 'Closures', 'Async/await', 'Memory management basics']
    elif 'sql' in t:
        extra = ['Indexes and query plans', 'Normalization vs denormalization', 'Transactions and isolation levels']
    else:
        extra = ['Core definitions', 'Common pitfalls', 'Performance considerations', 'Best practices']
    for e in extra:
        if e not in roadmap:
            roadmap.append(e)

    session['final'] = {
        'score': final_score,
        'guidance': guidance,
        'mcq_score_10': mcq_score_10,
        'base_eval_score': base_final,
        'learning_profile': learning_profile,
        'honest_feedback': honest_feedback,
        'roadmap': roadmap,
    }
    _write_json(session_path, session)

    # Persist summary to user model if user_id is present, then cleanup temp files (keep subtopics cache)
    try:
        user_id = session.get('user_id')
        if user_id:
            from bson import ObjectId
            from database import db as _db
            await _db['users'].update_one(
                { '_id': ObjectId(user_id) },
                { '$set': {
                    'last_quiz': {
                        'topic': session.get('topic'),
                        'final_score_10': final_score,
                        'misconception': session.get('misconception') or [],
                        'honest_feedback': honest_feedback,
                        'guidance': guidance,
                        'roadmap': roadmap,
                        'learning_profile': learning_profile,
                        'completed_at': __import__('datetime').datetime.utcnow().isoformat()
                    }
                } }
            )
        # After storing, delete evaluation temp file and quiz session file
        try:
            eval_path = session.get('source_eval_path')
            if eval_path and os.path.exists(eval_path):
                os.remove(eval_path)
        except Exception:
            pass
        try:
            if os.path.exists(session_path):
                os.remove(session_path)
        except Exception:
            pass
    except Exception:
        # If persistence/cleanup fails, do not block response
        pass

    return {
        'final_score_10': final_score,
        'guidance': guidance,
        'learning_profile': learning_profile,
        'honest_feedback': honest_feedback,
        'roadmap': roadmap,
        'session_file_path': session_path
    }
