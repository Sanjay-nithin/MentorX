import os
import uuid
import json
import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from .kgController import call_groq_chat, call_openrouter_chat, _extract_json_block

router = APIRouter(tags=["QuizSessions"]) 

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


def _toon_to_json(toon_text: str) -> Dict[str, Any]:
    """Convert TOON (Token Oriented Object Notation) format to JSON.
    
    TOON Format Example:
    topic: Python Variables
    score: 8.5
    strengths:
      - Variable assignment
      - Data types
    weaknesses:
      - Type hints
      - Memory allocation
    
    Converts to:
    {
      "topic": "Python Variables",
      "score": 8.5,
      "strengths": ["Variable assignment", "Data types"],
      "weaknesses": ["Type hints", "Memory allocation"]
    }
    """
    try:
        result = {}
        lines = toon_text.strip().split('\n')
        current_key = None
        current_list = []
        indent_level = 0
        
        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith('#'):
                continue
                
            # Check indentation for list items
            leading_spaces = len(line) - len(line.lstrip())
            
            # List item
            if stripped.startswith('- '):
                item = stripped[2:].strip()
                current_list.append(item)
            # Key-value pair
            elif ':' in stripped:
                parts = stripped.split(':', 1)
                key = parts[0].strip()
                value = parts[1].strip() if len(parts) > 1 else ''
                
                # Save previous list if any
                if current_key and current_list:
                    result[current_key] = current_list
                    current_list = []
                
                # Parse value
                if value:
                    # Try to convert to number
                    try:
                        if '.' in value:
                            result[key] = float(value)
                        else:
                            result[key] = int(value)
                    except ValueError:
                        # Boolean
                        if value.lower() in ['true', 'yes']:
                            result[key] = True
                        elif value.lower() in ['false', 'no']:
                            result[key] = False
                        else:
                            result[key] = value
                else:
                    # Empty value means list follows
                    current_key = key
            
        # Save final list if any
        if current_key and current_list:
            result[current_key] = current_list
            
        return result
    except Exception as e:
        print(f"Error parsing TOON format: {e}")
        return {}


def _json_to_toon(data: Dict[str, Any], indent: int = 0) -> str:
    """Convert JSON to TOON (Token Oriented Object Notation) format.
    
    Example:
    {"topic": "Python", "score": 8.5, "items": ["a", "b"]}
    
    Converts to:
    topic: Python
    score: 8.5
    items:
      - a
      - b
    """
    lines = []
    prefix = '  ' * indent
    
    for key, value in data.items():
        if isinstance(value, list):
            lines.append(f"{prefix}{key}:")
            for item in value:
                if isinstance(item, dict):
                    lines.append(f"{prefix}  -")
                    lines.append(_json_to_toon(item, indent + 2))
                else:
                    lines.append(f"{prefix}  - {item}")
        elif isinstance(value, dict):
            lines.append(f"{prefix}{key}:")
            lines.append(_json_to_toon(value, indent + 1))
        else:
            lines.append(f"{prefix}{key}: {value}")
    
    return '\n'.join(lines)


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
    misconception = eval_data.get('misconception') or []
    two_questions = eval_data.get('two_questions') or []
    one_question = eval_data.get('one_question') or []

    # Prompt Groq to produce 5 MCQs per group using TOON format
    groq_model = os.getenv('GROQ_GENERATOR_MODEL', 'llama-3.3-70b-versatile')

    def build_mcq_prompt_toon(group_name: str, topics: List[str], main_topic: str, avoid_stems: List[str]) -> str:
        """Build MCQ generation prompt with universal domain-accuracy requirements and proper question distribution."""
        
        # Determine question distribution based on group type
        if 'misconception' in group_name.lower():
            question_count = 5
            focus = f"Focus on COMMON MISCONCEPTIONS in {main_topic}. Generate questions that expose false beliefs or incorrect understandings."
        elif 'two' in group_name.lower():
            question_count = 2
            focus = f"Generate 2 questions covering different aspects of the subtopics in {main_topic}."
        else:  # 'one' questions group
            question_count = 1
            focus = f"Generate 1 focused question on a key concept from the subtopics in {main_topic}."
        
        accuracy_rules = f"""
accuracy_requirements:
  - You are an EXPERT in {main_topic} - use ONLY authoritative terminology
  - Verify every technical term against standard references for {main_topic}
  - Use precise, field-specific terminology (academic/professional standard)
  - NO casual language, NO approximations, NO colloquialisms
  - Correct answer must be unambiguous based on domain consensus
  - Wrong options must be clearly wrong per domain standards
  - If domain has official documentation/standards, follow it exactly
  - If domain is academic, follow textbook/scholarly consensus"""
        
        domain_rules = f"""
domain_rules:
  - Focus STRICTLY on {main_topic} and its established concepts
  - Test ONLY concepts directly covered in the provided subtopics
  - Use terminology standard in {main_topic} field/discipline
  - Ensure accuracy matches what experts in {main_topic} would verify
  - Cross-verify technical accuracy with authoritative sources
  - Questions must be domain-specific (e.g., if topic is Python, ask Python questions; if ESP32, ask about ESP32 components)"""
        
        subtopic_coverage = f"""
subtopic_coverage_requirement:
  - EVERY subtopic listed below MUST be covered by at least one question
  - Distribute questions across ALL subtopics evenly
  - Do NOT skip any subtopic
  - Ensure comprehensive coverage of the domain area"""
        
        prompt = f"""You are a DOMAIN EXPERT creating technically accurate assessment questions.

Your expertise: {main_topic}
Your task: Generate {question_count} MCQs with 100% accuracy according to established knowledge in {main_topic}

main_topic: {main_topic}
group: {group_name}
question_count: {question_count}
{focus}

subtopics:
"""
        for topic in topics:
            prompt += f"  - {topic}\n"
        
        prompt += f"""
{subtopic_coverage}

{domain_rules}

{accuracy_rules}

quality_rules:
  - Each question tests ONE specific concept from {main_topic}
  - Correct answer must be indisputably correct per domain consensus
  - Wrong options must be definitively wrong (no edge cases or debate)
  - No ambiguous wording - domain experts should agree on answer
  - Test understanding of core principles in {main_topic}
  - Use terminology that practitioners/scholars in {main_topic} use
  - Vary difficulty: foundational, intermediate, advanced

uniqueness_rules:
  - Each question must test a DIFFERENT concept
  - No duplicate or overly similar questions
  - Avoid these previously used patterns:"""
        
        for stem in avoid_stems[:10]:
            if stem:
                prompt += f"\n    - {stem}"
        
        prompt += f"""

output_format: Return ONLY in TOON format exactly as shown below
items:
  -
    question: [Clear, domain-specific question about {subtopics}]
    options:
      - [option 1]
      - [option 2]
      - [option 3]
      - [option 4]
    answer_index: [0-3]
    reason: [brief explanation]

CRITICAL: Generate EXACTLY 5 questions. Return ONLY TOON format. No markdown, no code blocks, no extra text."""
        
        return prompt

    def parse_items_toon(raw: str) -> List[Dict[str, Any]]:
        """Parse TOON format response into list of MCQ items."""
        try:
            # Remove markdown code blocks if present
            cleaned = _extract_json_block(raw) if '```' in raw else raw.strip()
            
            # Try parsing as TOON first
            if 'items:' in cleaned or ('question:' in cleaned and 'options:' in cleaned):
                # Parse TOON format
                items = []
                current_item = {}
                current_options = []
                in_options = False
                
                for line in cleaned.split('\n'):
                    stripped = line.strip()
                    if not stripped or stripped.startswith('#'):
                        continue
                    
                    # Start of new item
                    if stripped == '-' and not in_options:
                        if current_item and 'question' in current_item:
                            current_item['options'] = current_options
                            items.append(current_item)
                        current_item = {}
                        current_options = []
                        in_options = False
                    elif stripped.startswith('question:'):
                        current_item['question'] = stripped.split(':', 1)[1].strip()
                        in_options = False
                    elif stripped == 'options:':
                        in_options = True
                    elif stripped.startswith('- ') and in_options:
                        option = stripped[2:].strip()
                        current_options.append(option)
                    elif stripped.startswith('answer_index:'):
                        try:
                            current_item['answer_index'] = int(stripped.split(':', 1)[1].strip())
                        except:
                            current_item['answer_index'] = 0
                        in_options = False
                    elif stripped.startswith('reason:'):
                        current_item['reason'] = stripped.split(':', 1)[1].strip()
                
                # Add last item
                if current_item and 'question' in current_item:
                    current_item['options'] = current_options
                    items.append(current_item)
                
                # Validate items
                valid_items = []
                for item in items:
                    if (item.get('question') and 
                        item.get('options') and len(item.get('options', [])) == 4 and
                        item.get('answer_index') is not None and
                        0 <= item.get('answer_index', -1) <= 3 and
                        item.get('reason')):
                        valid_items.append(item)
                
                return valid_items[:5]
            
            # Fallback to JSON parsing
            try:
                data = json.loads(cleaned)
                items = data.get('items', [])
                return items[:5] if isinstance(items, list) else []
            except:
                return []
                
        except Exception as e:
            print(f"Error parsing TOON MCQ response: {e}")
            return []

    groups = {
        'misconception': misconception,
        'two_questions': two_questions,
        'one_question': one_question,
    }

    mcq: Dict[str, List[Dict[str, Any]]] = { 'misconception': [], 'two_questions': [], 'one_question': [] }

    prev_stems: List[str] = []
    for g, topics_list in groups.items():
        if not topics_list:
            mcq[g] = []
            continue
        prompt = build_mcq_prompt_toon(g, topics_list, topic, prev_stems)
        raw = call_groq_chat(groq_model, prompt)
        items = parse_items_toon(raw)
        mcq[g] = items
        # accumulate stems to avoid in subsequent groups
        prev_stems.extend([_norm_stem((it.get('question') or '')) for it in items])

    # Optional critic+validator passes via OpenRouter using Llama instruct model
    critic_model = os.getenv('OPENROUTER_CRITIC_MODEL', 'meta-llama/llama-3.3-70b-instruct:free')

    def critic_pass(group_name: str, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not items:
            return items
        
        # Universal domain-agnostic critique with accuracy verification
        domain_topic = topic or 'this subject'
        
        prompt = f"""You are a TECHNICAL REVIEWER with expertise in {domain_topic}.

Your task: Verify accuracy and quality of assessment questions for {domain_topic}

task: critique_mcqs
group: {group_name}
domain: {domain_topic}

CRITICAL VERIFICATION RULES:
1. Domain Accuracy:
   - Every term must be standard in {domain_topic} field
   - Check against authoritative sources for {domain_topic}
   - REJECT questions with incorrect/non-standard terminology
   - Verify concepts match expert consensus in {domain_topic}

2. Technical Precision:
   - Correct answer must be indisputably correct per domain standards
   - Wrong options must be definitively wrong (no gray areas)
   - No ambiguous or debatable statements
   - Terminology must match what experts in {domain_topic} use

3. Domain Relevance:
   - Questions must be STRICTLY about {domain_topic}
   - NO concepts from unrelated domains
   - Must directly test the specified subtopics
   - Avoid tangential or loosely related content

4. Uniqueness:
   - Each question tests a DIFFERENT concept
   - NO duplicate or overly similar questions
   - Compare all questions to ensure distinct learning objectives

5. Clarity:
   - Questions must be unambiguous
   - Options must be clearly distinct
   - No trick wording or confusing phrasing

ACCURACY VERIFICATION PROCESS:
- Review each technical term for correctness in {domain_topic}
- Flag any non-standard or casual terminology
- Ensure statements are factually accurate per domain consensus
- Verify the correct answer is truly correct by domain standards
- Confirm wrong options are clearly wrong by domain standards

output_schema:
  - Return JSON only: {{"items": [{{"question": str, "options": [str, str, str, str], "answer_index": int, "reason": str}}]}}
  - Maximum 5 items
  - Fix terminology errors or remove inaccurate items
  - Keep only technically accurate questions

items_to_review: {json.dumps(items)}
"""
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
        
        # Universal domain-agnostic final validation
        domain_topic = topic or 'this subject'
        
        prompt = f"""You are the FINAL VALIDATOR ensuring 100% accuracy for {domain_topic} assessment.

task: validate_mcqs
group: {group_name}
domain: {domain_topic}

MANDATORY VERIFICATION CHECKLIST:
✓ Domain Accuracy (Non-negotiable):
  - ALL terms must be from authoritative {domain_topic} sources
  - Zero tolerance for incorrect/casual terminology
  - Verify against academic/official standards for {domain_topic}
  - Correct answer must be indisputable by domain expert consensus
  - Cross-verify technical claims against established knowledge

✓ Question Quality (Required):
  - Each question tests UNIQUE concept in {domain_topic}
  - NO overlapping or duplicate questions
  - Difficulty appropriate for learners
  - Clear, unambiguous wording

✓ Option Validity (Critical):
  - Correct answer: 100% correct by {domain_topic} standards
  - Wrong options: Clearly wrong, not debatable
  - All options plausible but only one definitively correct
  - No trick questions or confusing distractors

✓ Domain Relevance (Strict):
  - Questions ONLY about {domain_topic}
  - NO cross-domain or tangential content
  - Must align with specified subtopics
  - Test real understanding, not trivia

✓ Structural Integrity:
  - All required fields present: question, options, answer_index, reason
  - Exactly 4 options per question
  - answer_index is valid (0-3)
  - NO empty strings

ACCURACY ENFORCEMENT:
- Verify EVERY technical statement against domain standards
- Flag and FIX any incorrect terminology immediately
- Ensure explanations use expert-level accurate language
- NO casual or informal terms in educational content
- When in doubt, check authoritative sources for {domain_topic}

UNIQUENESS ENFORCEMENT:
- REJECT duplicate questions
- REJECT questions with >70% similar wording
- REJECT questions testing same concept with different phrasing
- Each question must have unique learning objective

FINAL ACTION:
- Keep questions that pass ALL checks
- FIX terminology errors in salvageable questions
- REMOVE questions with fundamental accuracy issues
- Return maximum 5 highest-quality validated items

output_format:
  - Return ONLY JSON: {{"items": [{{"question": str, "options": [str, str, str, str], "answer_index": int, "reason": str}}]}}
  - Maximum 5 items
  - Only technically accurate, pedagogically sound questions

items_to_validate: {json.dumps(items)}
"""
        try:
            raw = call_groq_chat(groq_model, prompt)
            cleaned = _extract_json_block(raw)
            data = json.loads(cleaned)
            return (data.get('items') or items)[:5]
        except Exception:
            return items

    for g in list(mcq.keys()):
        mcq[g] = validator_pass(g, mcq[g])

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
    """Record user answer with immediate evaluation and reasoning using TOON format.
    Input: { session_file_path: string, answer_index: int, question_index: int }
    Output: { correct: bool, reason: string, question_number: int, user_answer: str, correct_answer: str }
    """
    session_path = (payload.get('session_file_path') or '').strip()
    if not session_path or not os.path.exists(session_path):
        raise HTTPException(status_code=400, detail='Valid session_file_path is required')

    session = _read_json(session_path)
    
    question_idx = payload.get('question_index')
    if question_idx is None:
        raise HTTPException(status_code=400, detail='question_index is required')
    
    # Build flat list of all questions
    all_groups = ['misconception', 'two_questions', 'one_question']
    all_questions = []
    for group in all_groups:
        items = session.get('mcq', {}).get(group, [])
        for idx, item in enumerate(items):
            all_questions.append({'group': group, 'index': idx, 'question': item})
    
    question_idx = int(question_idx)
    if question_idx < 0 or question_idx >= len(all_questions):
        raise HTTPException(status_code=400, detail='Invalid question_index')
    
    q_info = all_questions[question_idx]
    g, idx = q_info['group'], q_info['index']
    q = q_info['question']

    user_ans = int(payload.get('answer_index'))
    correct_index = int(q.get('answer_index'))
    is_correct = (user_ans == correct_index)

    # Use the pre-generated reasoning from quiz generation (no LLM call needed!)
    reason = q.get('reason', '')
    
    # Build explanation based on correctness with fallback for missing reasoning
    if is_correct:
        explanation = f"Correct! {reason}" if reason else "Correct answer!"
    else:
        # For wrong answers, provide detailed explanation using stored reasoning
        correct_option = q.get('options', [])[correct_index] if 0 <= correct_index < len(q.get('options', [])) else 'the correct option'
        user_option = q.get('options', [])[user_ans] if 0 <= user_ans < len(q.get('options', [])) else 'your selected option'
        
        if reason:
            # Use pre-generated reasoning if available
            explanation = f"Incorrect. {reason}"
        else:
            # Fallback: Provide basic explanation if AI failed to generate reasoning
            explanation = f"The correct answer is '{correct_option}'. You selected '{user_option}'."

    # Record answer in session
    entry = {
        'group': g,
        'index': idx,
        'question_number': question_idx,
        'user_answer': user_ans,
        'correct': is_correct,
        'reason': explanation,
    }
    answers = session.get('answers') or []
    answers.append(entry)
    session['answers'] = answers

    if not is_correct:
        mistakes = session.get('mistakes') or []
        mistakes.append({
            'group': g,
            'index': idx,
            'question_number': question_idx,
            'question': q.get('question'),
            'user_answer': user_ans,
            'correct_answer': correct_index,
            'reason': explanation,
        })
        session['mistakes'] = mistakes

    session['current'] = None
    _write_json(session_path, session)
    
    return {
        'correct': is_correct,
        'reason': explanation,
        'question_number': question_idx,
        'user_answer': q.get('options', [])[user_ans] if 0 <= user_ans < len(q.get('options', [])) else '',
        'correct_answer': q.get('options', [])[correct_index] if 0 <= correct_index < len(q.get('options', [])) else '',
    }

@router.post('/finish')
async def finish_session(payload: dict):
    """Comprehensive quiz analysis using GROK AI with TOON format.
    Returns detailed feedback, learning patterns, weak/strong topics, and next steps.
    Input: { session_file_path: string }
    Output: { 
        total_questions, correct_answers, wrong_answers, final_score_10,
        guidance, learning_profile, honest_feedback, roadmap, 
        weak_topics, strong_topics, next_topic_suggestion, mistakes_detail
    }
    """
    session_path = (payload.get('session_file_path') or '').strip()
    if not session_path or not os.path.exists(session_path):
        raise HTTPException(status_code=400, detail='Valid session_file_path is required')

    session = _read_json(session_path)

    # Calculate scores
    total = len(session.get('answers') or [])
    correct = sum(1 for a in (session.get('answers') or []) if a.get('correct'))
    wrong = total - correct
    
    if total == 0:
        raise HTTPException(status_code=400, detail='No answers recorded. Complete at least one question.')
    
    score_percentage = (correct / total) * 100
    final_score_10 = round((correct / total) * 10.0, 2)

    # Collect detailed mistake and correct answer information
    mistakes_detail = []
    correct_answers_detail = []
    weak_topics = []
    strong_topics = []
    
    for ans in (session.get('answers') or []):
        g = ans.get('group')
        idx = int(ans.get('index'))
        mcq_items = ((session.get('mcq') or {}).get(g) or [])
        
        if idx < len(mcq_items):
            mcq_item = mcq_items[idx]
            topic_name = None
            
            # Get topic name
            if g == 'misconception' and idx < len(session.get('misconception') or []):
                topic_name = session['misconception'][idx]
            elif g == 'two_questions' and idx < len(session.get('two_questions') or []):
                topic_name = session['two_questions'][idx]
            elif g == 'one_question' and idx < len(session.get('one_question') or []):
                topic_name = session['one_question'][idx]
            
            if ans.get('correct'):
                if topic_name:
                    strong_topics.append(topic_name)
                correct_answers_detail.append({
                    'question': mcq_item.get('question', ''),
                    'topic': topic_name or 'Unknown'
                })
            else:
                if topic_name:
                    weak_topics.append(topic_name)
                user_ans_idx = ans.get('user_answer', -1)
                correct_ans_idx = mcq_item.get('answer_index', -1)
                
                mistakes_detail.append({
                    'question': mcq_item.get('question', ''),
                    'topic': topic_name or 'Unknown',
                    'user_answer': mcq_item.get('options', [])[user_ans_idx] if 0 <= user_ans_idx < len(mcq_item.get('options', [])) else 'Not answered',
                    'correct_answer': mcq_item.get('options', [])[correct_ans_idx] if 0 <= correct_ans_idx < len(mcq_item.get('options', [])) else 'Unknown',
                    'reason': ans.get('reason', mcq_item.get('reason', ''))
                })

    # Deduplicate topics
    weak_topics = list(dict.fromkeys([t for t in weak_topics if t]))
    strong_topics = list(dict.fromkeys([t for t in strong_topics if t]))

    # Call DeepSeek AI with TOON format for comprehensive analysis
    learning_profile = None
    honest_feedback = None
    roadmap = []
    next_topic_suggestion = None
    
    try:
        eval_model = os.getenv('OPENROUTER_EVAL_MODEL', 'tngtech/deepseek-r1t2-chimera:free')
        
        # Build TOON format input
        toon_input = f"""topic: {session.get('topic')}
total_questions: {total}
correct_answers: {correct}
wrong_answers: {wrong}
score_percentage: {score_percentage:.1f}%
final_score_10: {final_score_10}

strong_topics:"""
        
        for st in strong_topics[:5]:
            toon_input += f"\n  - {st}"
        
        if not strong_topics:
            toon_input += "\n  - None identified"
        
        toon_input += "\n\nweak_topics:"
        for wt in weak_topics[:5]:
            toon_input += f"\n  - {wt}"
        
        if not weak_topics:
            toon_input += "\n  - None identified"
        
        toon_input += "\n\nmistakes_detail:"
        for i, mistake in enumerate(mistakes_detail, 1):  # Include ALL mistakes
            toon_input += f"\n  mistake_{i}:"
            toon_input += f"\n    topic: {mistake['topic']}"
            toon_input += f"\n    question: {mistake['question']}"
            toon_input += f"\n    user_answered: {mistake['user_answer']}"
            toon_input += f"\n    correct_answer: {mistake['correct_answer']}"
            toon_input += f"\n    reasoning: {mistake['reason'][:200]}"
        
        toon_input += "\n\ncorrect_answers_detail:"
        for i, correct_ans in enumerate(correct_answers_detail, 1):
            toon_input += f"\n  correct_{i}:"
            toon_input += f"\n    topic: {correct_ans['topic']}"
            toon_input += f"\n    question: {correct_ans['question']}"
        
        # TOON format prompt for     with deep analysis capabilities
        prompt = f"""Analyze quiz performance using GROK intelligence to detect ALL knowledge gaps, even unlisted subtopics.

INPUT DATA (TOON format):
{toon_input}

CRITICAL ANALYSIS REQUIREMENTS:
1. DEEP PATTERN RECOGNITION:
   - Analyze EACH mistake to identify underlying concept weakness
   - Detect implicit knowledge gaps not explicitly listed in weak_topics
   - Identify fundamental vs superficial understanding issues
   - Recognize patterns across multiple mistakes

2. CONCEPT INFERENCE:
   - Infer missing foundational concepts from mistake patterns
   - Detect weak prerequisite knowledge affecting performance
   - Identify conceptual misunderstandings from wrong answer choices
   - Discover hidden weak areas by analyzing reasoning errors

3. LEARNING PATTERN ANALYSIS:
   - Identify learning style from correct/wrong distribution
   - Detect cognitive patterns (e.g., strong theory/weak application)
   - Recognize preparation gaps or study approach issues

4. PREDICTIVE DIAGNOSIS:
   - Predict which unlisted concepts user likely struggles with
   - Identify conceptual clusters where weakness exists
   - Suggest prerequisite topics that may need review

PERFORMANCE RULES:
- Score < 50%: WEAK - Critical foundational gaps, start with basics
- Score 50-70%: MODERATE - Selective understanding, targeted practice needed
- Score 70-85%: GOOD - Minor gaps, polish with focused review
- Score > 85%: EXCELLENT - Strong mastery, ready for advanced topics

OUTPUT FORMAT: Return ONLY in TOON format as shown below (no markdown, no code blocks)

learning_pattern: [One precise sentence describing how user learns based on evidence]

strengths:
  - [Specific strength 1 with evidence from correct answers]
  - [Specific strength 2 with evidence]
  - [Specific strength 3 with evidence]

weaknesses:
  - [Explicit weakness 1 from listed weak topics]
  - [Explicit weakness 2 from listed weak topics]
  - [INFERRED weakness 3 - concept NOT in weak_topics but detected from mistake patterns]
  - [INFERRED weakness 4 - underlying concept gap detected]

hidden_weak_concepts:
  - [Unlisted concept 1 user likely struggles with based on mistake analysis]
  - [Unlisted concept 2 inferred from reasoning errors]
  - [Unlisted concept 3 detected from answer pattern]

focus_priority:
  - [Highest priority: most critical gap]
  - [Second priority: prerequisite or foundational need]
  - [Third priority: conceptual misunderstanding to fix]

honest_feedback: [3-4 sentences of direct, evidence-based feedback - brutally honest about performance level, what works, what doesn't, and what needs immediate work]

next_steps:
  - [Immediate concrete action 1 targeting biggest gap]
  - [Immediate concrete action 2 for foundational fix]
  - [Immediate concrete action 3 for practice]
  - [Immediate concrete action 4 for verification]

next_topic_to_learn: [ONE specific topic user should study next - can be listed OR unlisted topic based on deep analysis]

next_topic_reason: [2-3 sentences explaining WHY this next topic makes sense given their performance patterns and detected gaps]

recommended_resources:
  - [Specific resource/practice area 1]
  - [Specific resource/practice area 2]
  - [Specific resource/practice area 3]

Return ONLY TOON format."""

        extra = {
            'system_message': 'You are GROK - a brutally honest AI tutor. Analyze learning patterns deeply and provide specific, actionable feedback. Use TOON format strictly.',
            'temperature': 0.3,
            'max_tokens': 2500,
            'timeout': 35,
        }
        
        raw = call_openrouter_chat(eval_model, prompt, extra=extra)
        parsed = _toon_to_json(raw)
        
        learning_profile = {
            'learning_pattern': parsed.get('learning_pattern', 'Performance shows mixed understanding'),
            'strengths': parsed.get('strengths', ['Completed the assessment']),
            'weaknesses': parsed.get('weaknesses', weak_topics[:3] if weak_topics else ['Need more practice']),
            'hidden_weak_concepts': parsed.get('hidden_weak_concepts', []),
            'focus_areas': parsed.get('focus_priority', weak_topics[:3] if weak_topics else ['Review fundamentals']),
        }
        
        honest_feedback = parsed.get('honest_feedback', 
            f'Score: {score_percentage:.1f}%. ' + 
            ('Excellent work! You have strong grasp of the concepts.' if score_percentage >= 85 else
             'Good job! Review your mistakes to reach mastery.' if score_percentage >= 70 else
             'You need more practice. Focus on the weak topics identified.' if score_percentage >= 50 else
             'Significant gaps in understanding. Start with fundamentals and build up systematically.'))
        
        roadmap = parsed.get('next_steps', [])
        if not roadmap:
            roadmap = parsed.get('recommended_resources', [])
        if not roadmap and weak_topics:
            roadmap = [f"Review {t}" for t in weak_topics[:4]]
        
        next_topic_suggestion = {
            'topic': parsed.get('next_topic_to_learn', 'Consolidate current knowledge'),
            'reason': parsed.get('next_topic_reason', 'Focus on strengthening fundamentals before advancing.')
        }
        
    except Exception as e:
        print(f"Error generating GROK analysis: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback analysis
        learning_profile = {
            'learning_pattern': f'Mixed performance across {len(weak_topics)} weak and {len(strong_topics)} strong areas',
            'strengths': strong_topics[:3] if strong_topics else ['Completed assessment'],
            'weaknesses': weak_topics[:3] if weak_topics else ['Need improvement'],
            'hidden_weak_concepts': [],
            'focus_areas': weak_topics[:3] if weak_topics else ['Review core concepts'],
        }
        
        honest_feedback = (
            f'Score: {score_percentage:.1f}% ({correct}/{total} correct). ' +
            ('Outstanding! You have excellent command of this topic. Consider advancing to more complex concepts.' if score_percentage >= 85 else
             'Very good! You understand most concepts. Review your mistakes to achieve mastery.' if score_percentage >= 70 else
             'Decent performance. Focus on strengthening the weak areas identified above.' if score_percentage >= 50 else
             'You need significant improvement. Study the fundamentals systematically and practice regularly.'))
        
        roadmap = []
        if weak_topics:
            roadmap = [f"Study {t} in depth" for t in weak_topics[:3]]
            roadmap.append("Practice with examples and exercises")
        else:
            roadmap = ["Review all concepts", "Practice with varied problems", "Test understanding with quizzes"]
        
        next_topic_suggestion = {
            'topic': weak_topics[0] if weak_topics else f'Advanced {session.get("topic")} concepts',
            'reason': 'This topic showed the most knowledge gaps in your assessment.' if weak_topics else 'Build on your strong foundation.'
        }

    # Simple guidance string
    guidance = ""
    if strong_topics:
        guidance = "✓ Strong: " + ", ".join(strong_topics[:3])
    if weak_topics:
        focus_line = "✗ Weak: " + ", ".join(weak_topics[:3])
        guidance = (guidance + " | " if guidance else "") + focus_line
    if not guidance:
        guidance = f"{correct}/{total} correct ({score_percentage:.1f}%)"

    # Save final results to session
    session['final'] = {
        'score': final_score_10,
        'total_questions': total,
        'correct_answers': correct,
        'wrong_answers': wrong,
        'guidance': guidance,
        'learning_profile': learning_profile,
        'honest_feedback': honest_feedback,
        'roadmap': roadmap,
        'next_topic_suggestion': next_topic_suggestion,
        'weak_topics': weak_topics,
        'strong_topics': strong_topics,
        'mistakes_detail': mistakes_detail,
        'completed_at': __import__('datetime').datetime.utcnow().isoformat()
    }
    _write_json(session_path, session)

    # Determine if user is eligible for PDF notes generation
    pdf_eligibility = {
        'eligible': final_score_10 >= 8.0,
        'message': (
            '🎉 Congratulations! Your score is excellent. You can generate PDF notes for this quiz.'
            if final_score_10 >= 8.0
            else f'📚 Your score is {final_score_10:.1f}/10. To generate PDF notes, you need a score of at least 8.0/10. Keep practicing!'
        )
    }

    return {
        'total_questions': total,
        'correct_answers': correct,
        'wrong_answers': wrong,
        'final_score_10': final_score_10,
        'score_percentage': round(score_percentage, 1),
        'guidance': guidance,
        'learning_profile': learning_profile,
        'honest_feedback': honest_feedback,
        'roadmap': roadmap,
        'next_topic_suggestion': next_topic_suggestion,
        'weak_topics': weak_topics,
        'strong_topics': strong_topics,
        'mistakes_detail': mistakes_detail,
        'session_file_path': session_path,
        'pdf_eligibility': pdf_eligibility
    }
