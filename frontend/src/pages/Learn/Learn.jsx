import React, { useState } from 'react';
import Sidebar from '../../components/Dashboard/Sidebar/Sidebar';
import { 
  Sparkles, 
  Send, 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FileText,
  Brain as BrainIcon,
  ArrowRight,
  Award,
  TrendingUp,
  Target,
  AlertCircle
} from 'lucide-react';
import { generateKG, evaluateExplanation, startQuiz, answerQuestion, finishQuiz } from '../../services/service';

function Learn() {
  const [topic, setTopic] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [error, setError] = useState('');
  const [showQuiz, setShowQuiz] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [quizResults, setQuizResults] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [questionResults, setQuestionResults] = useState({});  // Store each question's result
  const [selectedAnswer, setSelectedAnswer] = useState(null);  // Currently selected answer

  const handleEvaluate = async () => {
    if (!topic.trim() || !explanation.trim()) {
      setError('Please enter both topic and explanation');
      return;
    }

    setLoading(true);
    setLoadingStage('Generating knowledge graph...');
    setError('');
    setEvaluationResult(null);
    setShowQuiz(false);

    try {
      // Step 1: Generate knowledge graph
      const kgResponse = await generateKG({ topic: topic.trim() });
      console.log('KG Response:', kgResponse);

      // Step 2: Evaluate explanation
      setLoadingStage('Evaluating your explanation...');
      const evalResponse = await evaluateExplanation({
        topic: topic.trim(),
        explanation: explanation.trim(),
        reasoning_enabled: true
      });
      console.log('Evaluation Response:', evalResponse);

      // Show evaluation result
      setEvaluationResult(evalResponse);
      setLoadingStage('Generating personalized quiz...');

      // Step 3: Start quiz and fetch all questions
      if (evalResponse && evalResponse.file_path) {
        const quizResponse = await startQuiz({
          eval_file_path: evalResponse.file_path,
          user_id: null
        });
        console.log('Quiz Session Started:', quizResponse);

        if (quizResponse && quizResponse.session_file_path) {
          // Fetch all quiz questions by calling /next until done
          const questions = [];
          let questionIndex = 0;
          
          while (true) {
            try {
              const nextQuestion = await fetch(`http://localhost:8000/api/quiz/next`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_file_path: quizResponse.session_file_path })
              });
              
              const nextData = await nextQuestion.json();
              
              if (nextData.done) {
                break; // No more questions
              }
              
              if (nextData.question) {
                questions.push({
                  id: `q_${questionIndex}`,
                  question: nextData.question.question,
                  options: nextData.question.options,
                  meta: nextData.meta
                });
                questionIndex++;
              } else {
                break;
              }
            } catch (err) {
              console.error('Error fetching question:', err);
              break;
            }
          }

          console.log('Fetched Questions:', questions);

          if (questions.length > 0) {
            setQuizData({
              questions,
              session_file_path: quizResponse.session_file_path,
              attempt_id: quizResponse.attempt_id
            });
            setShowQuiz(true);
          } else {
            setError('No quiz questions were generated. Please try again.');
          }
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err?.message || 'Failed to process. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleAnswerSelect = (optionIndex) => {
    setSelectedAnswer(optionIndex);
  };

  const handleConfirmAnswer = async () => {
    if (selectedAnswer === null) {
      setError('Please select an answer first');
      return;
    }

    setLoading(true);
    setLoadingStage('Evaluating your answer...');
    setError('');

    try {
      // Call /answer endpoint with question_index and answer_index
      const result = await answerQuestion(
        quizData.session_file_path,
        currentQuestionIndex,
        selectedAnswer
      );

      // Store the result for this question
      setQuestionResults({
        ...questionResults,
        [currentQuestionIndex]: result
      });

      // Store the answer
      setUserAnswers({
        ...userAnswers,
        [currentQuestionIndex]: selectedAnswer
      });

      // Clear selected answer for next question
      setSelectedAnswer(null);

      console.log('Answer result:', result);
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(userAnswers[currentQuestionIndex + 1] ?? null);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(userAnswers[currentQuestionIndex - 1] ?? null);
    }
  };

  const handleBackToLearn = () => {
    setShowQuiz(false);
    setShowResults(false);
    setQuizData(null);
    setQuizResults(null);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuestionResults({});
    setSelectedAnswer(null);
    setEvaluationResult(null);
    setTopic('');
    setExplanation('');
  };

  const handleFinishQuiz = async () => {
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < quizData.questions.length) {
      if (!window.confirm(`You've answered ${answeredCount} out of ${quizData.questions.length} questions. Are you sure you want to finish?`)) {
        return;
      }
    }

    setLoading(true);
    setLoadingStage('Analyzing performance with GROK AI...');

    try {
      // Get final results with comprehensive GROK analysis
      const results = await finishQuiz(quizData.session_file_path);
      console.log('Quiz Results:', results);
      
      setQuizResults(results);
      setShowQuiz(false);
      setShowResults(true);
    } catch (err) {
      console.error('Error finishing quiz:', err);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  // Results View
  if (showResults && quizResults) {
    const scorePercentage = (quizResults.correct_answers / quizResults.total_questions) * 100;
    const scoreColor = scorePercentage >= 70 ? 'text-green-400' : scorePercentage >= 50 ? 'text-yellow-400' : 'text-red-400';

    return (
      <div className="flex min-h-screen bg-black">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <div className="min-h-screen p-6 pt-24 lg:pt-12">
            <div className="max-w-4xl mx-auto">
              {/* Results Header */}
              <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-2 border-purple-500 mb-4">
                  <Award className="h-10 w-10 text-purple-400" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Quiz Complete!
                </h1>
                <p className="text-xl text-gray-400">{topic}</p>
              </div>

              {/* Score Card */}
              <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-8 mb-6">
                <div className="text-center mb-8">
                  <div className={`text-6xl font-bold ${scoreColor} mb-2`}>
                    {quizResults.final_score_10.toFixed(1)}/10
                  </div>
                  <p className="text-gray-400 text-lg">Final Score</p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-black/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-white mb-1">{quizResults.total_questions}</div>
                    <div className="text-sm text-gray-400">Total</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-400 mb-1">{quizResults.correct_answers}</div>
                    <div className="text-sm text-gray-400">Correct</div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-red-400 mb-1">{quizResults.wrong_answers}</div>
                    <div className="text-sm text-gray-400">Wrong</div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-white">{quizResults.guidance}</p>
                </div>
              </div>

              {/* Feedback Section */}
              {quizResults.honest_feedback && (
                <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    Personalized Feedback
                  </h3>
                  <p className="text-gray-300">{quizResults.honest_feedback}</p>
                </div>
              )}

              {/* Learning Profile */}
              {quizResults.learning_profile && (
                <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-400" />
                    Learning Profile
                  </h3>
                  
                  {quizResults.learning_profile.strengths && quizResults.learning_profile.strengths.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-green-400 font-semibold mb-2">💪 Strengths:</h4>
                      <ul className="space-y-1">
                        {quizResults.learning_profile.strengths.map((strength, idx) => (
                          <li key={idx} className="text-gray-300 flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {quizResults.learning_profile.weaknesses && quizResults.learning_profile.weaknesses.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Areas for Improvement:</h4>
                      <ul className="space-y-1">
                        {quizResults.learning_profile.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="text-gray-300 flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {quizResults.learning_profile.hidden_weak_concepts && quizResults.learning_profile.hidden_weak_concepts.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-orange-400 font-semibold mb-2">🔍 Hidden Weak Concepts (Detected by AI):</h4>
                      <p className="text-xs text-gray-500 mb-2">These concepts weren't explicitly tested but GROK detected potential gaps based on your answer patterns.</p>
                      <ul className="space-y-1">
                        {quizResults.learning_profile.hidden_weak_concepts.map((concept, idx) => (
                          <li key={idx} className="text-gray-300 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                            <span>{concept}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {quizResults.learning_profile.focus_areas && quizResults.learning_profile.focus_areas.length > 0 && (
                    <div>
                      <h4 className="text-blue-400 font-semibold mb-2">🎯 Focus Areas:</h4>
                      <ul className="space-y-1">
                        {quizResults.learning_profile.focus_areas.map((area, idx) => (
                          <li key={idx} className="text-gray-300 flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Roadmap */}
              {quizResults.roadmap && quizResults.roadmap.length > 0 && (
                <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">📚 Recommended Learning Path</h3>
                  <ol className="space-y-3">
                    {quizResults.roadmap.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-semibold flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-gray-300 pt-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Mistakes Detail */}
              {quizResults.mistakes_detail && quizResults.mistakes_detail.length > 0 && (
                <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-500/30 rounded-2xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">❌ Review Your Mistakes</h3>
                  <div className="space-y-4">
                    {quizResults.mistakes_detail.map((mistake, idx) => (
                      <div key={idx} className="bg-black/50 rounded-xl p-4">
                        <p className="text-white font-semibold mb-2">{mistake.question}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="text-red-400 font-semibold">Your answer:</span>
                            <span className="text-gray-300">{mistake.user_answer}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-green-400 font-semibold">Correct answer:</span>
                            <span className="text-gray-300">{mistake.correct_answer}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-400 font-semibold">Explanation:</span>
                            <span className="text-gray-300">{mistake.reason}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleBackToLearn}
                  className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-lg transition-all"
                >
                  Try Another Topic
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showQuiz && quizData) {
    const currentQuestion = quizData.questions[currentQuestionIndex];
    const currentResult = questionResults[currentQuestionIndex];
    const hasAnswered = userAnswers[currentQuestionIndex] !== undefined;

    return (
      <div className="flex min-h-screen bg-black">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <div className="min-h-screen p-6 pt-24 lg:pt-12">
            <div className="max-w-5xl mx-auto">
              {/* Quiz Header */}
              <div className="mb-6">
                <button
                  onClick={handleBackToLearn}
                  className="mb-4 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Back to Learn
                </button>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <BrainIcon className="h-8 w-8 text-purple-400" />
                  Quiz: {topic}
                </h1>
                <p className="text-gray-400">
                  Question {currentQuestionIndex + 1} of {quizData.questions.length}
                </p>
              </div>

              {/* Progress indicator - Simple text display */}
              <div className="mb-6 bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Answered: {Object.keys(userAnswers).length} / {quizData.questions.length}
                  </span>
                  <span className="text-gray-400">
                    Evaluated: {Object.keys(questionResults).length}
                  </span>
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-8 mb-6">
                <div className="mb-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Lightbulb className="h-5 w-5 text-purple-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white flex-1">
                      {currentQuestion.question}
                    </h2>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={hasAnswered}
                      className={`
                        w-full text-left p-4 rounded-xl border-2 transition-all
                        ${hasAnswered ? 'cursor-not-allowed opacity-60' : ''}
                        ${
                          selectedAnswer === index
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-6 h-6 rounded-full border-2 flex items-center justify-center
                          ${selectedAnswer === index ? 'border-purple-500 bg-purple-500' : 'border-gray-500'}
                        `}>
                          {selectedAnswer === index && (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <span className="text-white">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Reasoning Display (if answered) */}
                {currentResult && (
                  <div className={`mt-6 p-4 rounded-xl border-2 ${
                    currentResult.correct 
                      ? 'bg-green-500/10 border-green-500/50' 
                      : 'bg-red-500/10 border-red-500/50'
                  }`}>
                    <div className="flex items-start gap-3 mb-2">
                      {currentResult.correct ? (
                        <CheckCircle2 className="h-6 w-6 text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className={`font-semibold mb-1 ${currentResult.correct ? 'text-green-400' : 'text-red-400'}`}>
                          {currentResult.correct ? 'Correct!' : 'Incorrect'}
                        </h3>
                        <p className="text-sm text-gray-300 mb-2">{currentResult.reason}</p>
                        {!currentResult.correct && (
                          <div className="text-sm mt-2 pt-2 border-t border-white/10">
                            <p className="text-gray-400">Your answer: <span className="text-red-400">{currentResult.user_answer}</span></p>
                            <p className="text-gray-400">Correct answer: <span className="text-green-400">{currentResult.correct_answer}</span></p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center gap-4">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>

                <div className="flex gap-3">
                  {!hasAnswered && (
                    <button
                      onClick={handleConfirmAnswer}
                      disabled={selectedAnswer === null || loading}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:from-purple-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Confirm Answer
                        </>
                      )}
                    </button>
                  )}

                  {hasAnswered && currentQuestionIndex < quizData.questions.length - 1 && (
                    <button
                      onClick={handleNextQuestion}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all flex items-center gap-2"
                    >
                      Next Question
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  )}

                  {Object.keys(userAnswers).length === quizData.questions.length && (
                    <button
                      onClick={handleFinishQuiz}
                      disabled={loading}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Award className="h-5 w-5" />
                          Finish Quiz
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <div className="text-white pt-24 lg:pt-12 pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center gap-3">
                <Sparkles className="h-10 w-10 text-yellow-400" />
                Learn & Practice
              </h1>
              <p className="text-xl text-gray-400">
                Explain what you've learned and get instant feedback with AI-powered evaluation
              </p>
            </div>

            {/* Main Card */}
            <div className="bg-gradient-to-br from-gray-800/50 to-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
              {/* Topic Input */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-lg font-semibold mb-3">
                  <FileText className="h-5 w-5 text-blue-400" />
                  Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Python Variables, React Hooks, Machine Learning..."
                  className="w-full px-6 py-4 bg-black/50 border border-white/20 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Explanation Input */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-lg font-semibold mb-3">
                  <Lightbulb className="h-5 w-5 text-yellow-400" />
                  Your Explanation
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain the concept in your own words... Be detailed and clear."
                  rows={8}
                  className="w-full px-6 py-4 bg-black/50 border border-white/20 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all resize-none"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              {/* Evaluation Result */}
              {evaluationResult && !loading && !showQuiz && (
                <div className="mb-6 p-6 bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle2 className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">Evaluation Complete!</h3>
                      <p className="text-gray-300 mb-3">{evaluationResult.summary || 'Your explanation has been evaluated successfully.'}</p>
                      {evaluationResult.content && (
                        <div className="space-y-2 text-sm">
                          {evaluationResult.content.average_subtopic_score && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">Content Score:</span>
                              <span className="text-white font-semibold">{evaluationResult.content.average_subtopic_score.toFixed(1)}/5</span>
                            </div>
                          )}
                          {evaluationResult.content.grammar_score && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">Grammar Score:</span>
                              <span className="text-white font-semibold">{evaluationResult.content.grammar_score}/5</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Evaluate Button */}
              <button
                onClick={handleEvaluate}
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    {loadingStage || 'Processing...'}
                  </>
                ) : (
                  <>
                    <Send className="h-6 w-6" />
                    Evaluate & Generate Quiz
                  </>
                )}
              </button>

              {/* Info Text */}
              <p className="mt-4 text-sm text-gray-500 text-center">
                Your explanation will be evaluated and a personalized quiz will be generated based on your understanding
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Learn;
