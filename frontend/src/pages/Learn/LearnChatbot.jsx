import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../../components/Dashboard/Sidebar/Sidebar';
import { 
  Send, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Brain as BrainIcon,
  ArrowRight,
  Award,
  TrendingUp,
  Target,
  AlertCircle,
  Bot,
  User,
  FileText
} from 'lucide-react';
import { generateKG, evaluateExplanation, startQuiz, answerQuestion, finishQuiz, generatePDFNotes } from '../../services/service';

function LearnChatbot() {
  // Chatbot states
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hi! I\'m your AI Learning Assistant. What topic would you like to learn today?',
      timestamp: new Date(),
      isTyping: false,
      displayedContent: 'Hi! I\'m your AI Learning Assistant. What topic would you like to learn today?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [conversationStage, setConversationStage] = useState('awaiting_topic');
  const [topic, setTopic] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [typingMessageId, setTypingMessageId] = useState(null);
  
  // Quiz states
  const [loading, setLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [quizResults, setQuizResults] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [questionResults, setQuestionResults] = useState({});
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  const addMessage = (type, content, shouldAnimate = false) => {
    const newMessage = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date(),
      isTyping: shouldAnimate && type === 'bot',
      displayedContent: shouldAnimate && type === 'bot' ? '' : content
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Start typing animation for bot messages
    if (shouldAnimate && type === 'bot') {
      animateTyping(newMessage.id, content);
    }
  };

  const animateTyping = (messageId, fullContent) => {
    setTypingMessageId(messageId);
    let currentIndex = 0;
    const typingSpeed = 10; 

    const typingInterval = setInterval(() => {
      currentIndex++;
      
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            displayedContent: fullContent.slice(0, currentIndex),
            isTyping: currentIndex < fullContent.length
          };
        }
        return msg;
      }));

      if (currentIndex >= fullContent.length) {
        clearInterval(typingInterval);
        setTypingMessageId(null);
      }
    }, typingSpeed);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    addMessage('user', userMessage);
    setInputValue('');
    // Reset textarea height after clearing input
    setTimeout(() => adjustTextareaHeight(), 0);
    setLoading(true);

    try {
      if (conversationStage === 'awaiting_topic') {
        // User provided topic
        setTopic(userMessage);
        setConversationStage('awaiting_explanation');
        
        setTimeout(() => {
          addMessage('bot', `Great! Let's learn about "${userMessage}". \n\nNow, explain this topic to me in your own words. I want to check whether you have understood it well or not. Take your time and be as detailed as you can!`, true);
          setLoading(false);
        }, 1000);
        
      } else if (conversationStage === 'awaiting_explanation') {
        // User provided explanation - start evaluation
        addMessage('bot', 'Fantastic! Let me evaluate your understanding and prepare a personalized quiz for you...', true);
        
        await handleEvaluate(userMessage);
      }
    } catch (err) {
      console.error('Error:', err);
      addMessage('bot', 'Oops! Something went wrong. Please try again.', true);
      setLoading(false);
    }
  };

  const handleEvaluate = async (explanationText) => {
    try {
      // Step 1: Generate knowledge graph
      const kgResponse = await generateKG({ topic: topic.trim() });
      console.log('KG Response:', kgResponse);

      // Step 2: Evaluate explanation
      const evalResponse = await evaluateExplanation({
        topic: topic.trim(),
        explanation: explanationText.trim(),
        reasoning_enabled: true
      });
      console.log('Evaluation Response:', evalResponse);

      // Step 3: Start quiz
      if (evalResponse && evalResponse.file_path) {
        const quizResponse = await startQuiz({
          eval_file_path: evalResponse.file_path,
          user_id: null
        });
        console.log('Quiz Session Started:', quizResponse);

        if (quizResponse && quizResponse.session_file_path) {
          // Fetch all quiz questions
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
                break;
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
            
            // Show success message and transition to quiz
            setTimeout(() => {
              addMessage('bot', `Perfect! I've analyzed your understanding and prepared ${questions.length} personalized questions to test your knowledge. Let's begin the quiz!`, true);
              setTimeout(() => {
                setShowQuiz(true);
                setLoading(false);
              }, 3000); // Increased to allow typing animation to complete
            }, 1000);
          } else {
            addMessage('bot', 'Sorry, I couldn\'t generate quiz questions. Please try again.', true);
            setLoading(false);
          }
        }
      }
    } catch (err) {
      console.error('Error:', err);
      addMessage('bot', 'Failed to process your explanation. Please try again.');
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionIndex) => {
    setSelectedAnswer(optionIndex);
  };

  const handleConfirmAnswer = async () => {
    if (selectedAnswer === null) return;

    setLoading(true);

    try {
      const result = await answerQuestion(
        quizData.session_file_path,
        currentQuestionIndex,
        selectedAnswer
      );

      const currentQuestion = quizData.questions[currentQuestionIndex];
      const correctAnswerText = currentQuestion.options[result.correct_answer];
      const userAnswerText = currentQuestion.options[selectedAnswer];

      setUserAnswers(prev => ({
        ...prev,
        [currentQuestionIndex]: selectedAnswer
      }));

      setQuestionResults(prev => ({
        ...prev,
        [currentQuestionIndex]: {
          correct: result.correct,
          reason: result.reason,
          user_answer: userAnswerText,
          correct_answer: correctAnswerText
        }
      }));

    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(userAnswers[currentQuestionIndex - 1] ?? null);
    }
  };

  const handleFinishQuiz = async () => {
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < quizData.questions.length) {
      if (!window.confirm(`You've answered ${answeredCount} out of ${quizData.questions.length} questions. Are you sure you want to finish?`)) {
        return;
      }
    }

    setLoading(true);

    try {
      const results = await finishQuiz(quizData.session_file_path);
      console.log('Quiz Results:', results);
      
      setQuizResults(results);
      setShowQuiz(false);
      setShowResults(true);
    } catch (err) {
      console.error('Error finishing quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLearn = () => {
    setMessages([
      {
        id: Date.now(),
        type: 'bot',
        content: 'Hi! I\'m your AI Learning Assistant. What topic would you like to learn today?',
        timestamp: new Date(),
        isTyping: false,
        displayedContent: 'Hi! I\'m your AI Learning Assistant. What topic would you like to learn today?'
      }
    ]);
    setInputValue('');
    setConversationStage('awaiting_topic');
    setTopic('');
    setShowQuiz(false);
    setShowResults(false);
    setQuizData(null);
    setQuizResults(null);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuestionResults({});
    setSelectedAnswer(null);
    setTypingMessageId(null);
    setGeneratingPDF(false);
    setPdfGenerated(false);
  };

  const handleGeneratePDF = async () => {
    if (!quizData || !quizResults) {
      alert('Quiz data not available');
      return;
    }

    setGeneratingPDF(true);

    try {
      await generatePDFNotes(quizData.session_file_path, quizResults);
      setPdfGenerated(true);
      alert('✅ PDF Notes Generated Successfully!\n\nYour study notes have been created and saved to your Resources. You can access them from the Resources page.');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('❌ Failed to Generate PDF\n\n' + (error.message || 'An error occurred while generating the PDF. Please try again.'));
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Results View
  if (showResults && quizResults) {
    return (
      <div className="flex min-h-screen bg-black">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <div className="min-h-screen p-6 pt-24 lg:pt-12">
            <div className="max-w-4xl mx-auto">
              {/* Results Header */}
              <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black border-2 border-white mb-4">
                  <Award className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Quiz Complete!
                </h1>
                <p className="text-xl text-gray-400">{topic}</p>
              </div>

              {/* Score Card */}
              <div className="bg-black border border-white/20 rounded-2xl p-8 mb-6">
                <div className="text-center mb-8">
                  <div className="text-6xl font-bold text-white mb-2">
                    {quizResults.final_score_10.toFixed(1)}/10
                  </div>
                  <p className="text-gray-400 text-lg">Final Score</p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-black border border-white/20 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-white mb-1">{quizResults.total_questions}</div>
                    <div className="text-sm text-gray-400">Total</div>
                  </div>
                  <div className="bg-black border border-white/20 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-white mb-1">{quizResults.correct_answers}</div>
                    <div className="text-sm text-gray-400">Correct</div>
                  </div>
                  <div className="bg-black border border-white/20 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-white mb-1">{quizResults.wrong_answers}</div>
                    <div className="text-sm text-gray-400">Wrong</div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                  <p className="text-white">{quizResults.guidance}</p>
                </div>

                {/* PDF Eligibility Message & Button */}
                {quizResults.pdf_eligibility && (
                  <div className={`mt-4 p-4 rounded-xl border ${
                    quizResults.pdf_eligibility.eligible
                      ? 'bg-white/5 border-white/30'
                      : 'bg-white/5 border-white/20'
                  }`}>
                    <p className="text-white text-sm mb-3">{quizResults.pdf_eligibility.message}</p>
                    
                    {/* Generate PDF Button */}
                    {quizResults.pdf_eligibility.eligible && !pdfGenerated && (
                      <button
                        onClick={handleGeneratePDF}
                        disabled={generatingPDF}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {generatingPDF ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Generating PDF...
                          </>
                        ) : (
                          <>
                            <FileText className="h-5 w-5" />
                            Generate PDF Notes
                          </>
                        )}
                      </button>
                    )}
                    
                    {/* PDF Generated Success Message */}
                    {pdfGenerated && (
                      <div className="flex items-center gap-2 text-white">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                        <span className="text-sm font-medium">PDF Notes Generated! Check Resources page.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Feedback Section */}
              {quizResults.honest_feedback && (
                <div className="bg-black border border-white/20 rounded-2xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-white" />
                    Personalized Feedback
                  </h3>
                  <p className="text-gray-400">{quizResults.honest_feedback}</p>
                </div>
              )}

              {/* Learning Profile */}
              {quizResults.learning_profile && (
                <div className="bg-black border border-white/20 rounded-2xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-white" />
                    Learning Profile
                  </h3>
                  
                  {quizResults.learning_profile.strengths && quizResults.learning_profile.strengths.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                        Strengths
                      </h4>
                      <ul className="space-y-1">
                        {quizResults.learning_profile.strengths.map((strength, idx) => (
                          <li key={idx} className="text-gray-400 flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-white mt-0.5 flex-shrink-0" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {quizResults.learning_profile.weaknesses && quizResults.learning_profile.weaknesses.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-white" />
                        Areas for Improvement
                      </h4>
                      <ul className="space-y-1">
                        {quizResults.learning_profile.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="text-gray-400 flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-white mt-0.5 flex-shrink-0" />
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {quizResults.learning_profile.hidden_weak_concepts && quizResults.learning_profile.hidden_weak_concepts.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-white" />
                        Hidden Weak Concepts (Detected by AI)
                      </h4>
                      <p className="text-xs text-gray-500 mb-2">These concepts weren't explicitly tested but AI detected potential gaps.</p>
                      <ul className="space-y-1">
                        {quizResults.learning_profile.hidden_weak_concepts.map((concept, idx) => (
                          <li key={idx} className="text-gray-400 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-white mt-0.5 flex-shrink-0" />
                            <span>{concept}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {quizResults.learning_profile.focus_areas && quizResults.learning_profile.focus_areas.length > 0 && (
                    <div>
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4 text-white" />
                        Focus Areas
                      </h4>
                      <ul className="space-y-1">
                        {quizResults.learning_profile.focus_areas.map((area, idx) => (
                          <li key={idx} className="text-gray-400 flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-white mt-0.5 flex-shrink-0" />
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
                <div className="bg-black border border-white/20 rounded-2xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-white" />
                    Recommended Learning Path
                  </h3>
                  <ol className="space-y-3">
                    {quizResults.roadmap.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white font-semibold flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-gray-400 pt-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Mistakes Detail */}
              {quizResults.mistakes_detail && quizResults.mistakes_detail.length > 0 && (
                <div className="bg-black border border-white/20 rounded-2xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-white" />
                    Review Your Mistakes
                  </h3>
                  <div className="space-y-4">
                    {quizResults.mistakes_detail.map((mistake, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <p className="text-white font-semibold mb-2">{mistake.question}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="text-white font-semibold">Your answer:</span>
                            <span className="text-gray-400">{mistake.user_answer}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-white font-semibold">Correct answer:</span>
                            <span className="text-gray-400">{mistake.correct_answer}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-white font-semibold">Explanation:</span>
                            <span className="text-gray-400">{mistake.reason}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex gap-4">
                <button
                  onClick={handleBackToLearn}
                  className="flex-1 py-4 px-6 bg-white text-black hover:bg-gray-200 rounded-xl font-semibold text-lg transition-all"
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

  // Quiz View
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
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <BrainIcon className="h-8 w-8 text-white" />
                  Quiz: {topic}
                </h1>
                <p className="text-gray-400">
                  Question {currentQuestionIndex + 1} of {quizData.questions.length}
                </p>
              </div>

              {/* Progress */}
              <div className="mb-6 bg-black border border-white/20 rounded-xl p-4">
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
              <div className="bg-black border border-white/20 rounded-2xl p-8 mb-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    {currentQuestion.question}
                  </h2>
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
                            ? 'border-white bg-white/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-6 h-6 rounded-full border-2 flex items-center justify-center
                          ${selectedAnswer === index ? 'border-white bg-white' : 'border-gray-500'}
                        `}>
                          {selectedAnswer === index && (
                            <CheckCircle2 className="h-4 w-4 text-black" />
                          )}
                        </div>
                        <span className="text-white">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Reasoning Display */}
                {currentResult && (
                  <div className={`mt-6 p-4 rounded-xl border-2 ${
                    currentResult.correct 
                      ? 'bg-white/5 border-white/30' 
                      : 'bg-white/5 border-white/20'
                  }`}>
                    <div className="flex items-start gap-3 mb-2">
                      {currentResult.correct ? (
                        <CheckCircle2 className="h-6 w-6 text-white flex-shrink-0" />
                      ) : (
                        <XCircle className="h-6 w-6 text-white flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">
                          {currentResult.correct ? 'Correct!' : 'Incorrect'}
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">{currentResult.reason}</p>
                        {!currentResult.correct && (
                          <div className="text-sm mt-2 pt-2 border-t border-white/10">
                            <p className="text-gray-400">Your answer: <span className="text-white">{currentResult.user_answer}</span></p>
                            <p className="text-gray-400">Correct answer: <span className="text-white">{currentResult.correct_answer}</span></p>
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
                      className="px-6 py-3 rounded-xl bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-2"
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
                      className="px-6 py-3 rounded-xl bg-white text-black hover:bg-gray-200 transition-all flex items-center gap-2 font-semibold"
                    >
                      Next Question
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  )}

                  {Object.keys(userAnswers).length === quizData.questions.length && (
                    <button
                      onClick={handleFinishQuiz}
                      disabled={loading}
                      className="px-6 py-3 rounded-xl bg-white text-black hover:bg-gray-200 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

  // Chatbot View (Default)
  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <div className="min-h-screen flex flex-col pt-24 lg:pt-12 pb-6 px-6">
          <div className="max-w-4xl mx-auto w-full flex flex-col flex-1">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Bot className="h-8 w-8 text-white" />
                AI Learning Assistant
              </h1>
              <p className="text-gray-400">
                Chat with AI to learn and test your knowledge
              </p>
            </div>

            {/* Chat Messages - No Container */}
            <div className="flex-1 mb-6 overflow-y-auto max-h-[calc(100vh-300px)]">
              <div className="space-y-8">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 items-start ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.type === 'bot' && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                        <Bot className="h-6 w-6 text-black" />
                      </div>
                    )}
                    <div className={`flex-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                      <p className={`text-lg whitespace-pre-wrap leading-relaxed ${
                        message.type === 'user' ? 'text-white' : 'text-gray-200'
                      }`}>
                        {message.displayedContent || message.content}
                        {message.isTyping && <span className="inline-block w-1 h-5 bg-gray-400 ml-1 animate-pulse"></span>}
                      </p>
                      <span className={`text-xs text-gray-500 mt-2 inline-block ${
                        message.type === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {message.type === 'user' && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-bold">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-4 items-start justify-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <Bot className="h-6 w-6 text-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        <span className="text-gray-400 text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="bg-white/5 border border-white/20 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex gap-3 items-end">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    conversationStage === 'awaiting_topic'
                      ? 'Type a topic (e.g., Python Variables, React Hooks)...'
                      : 'Explain the topic in your own words...'
                  }
                  rows={1}
                  disabled={loading}
                  className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50 min-h-[44px] overflow-hidden"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || loading}
                  className="px-6 py-3 bg-white text-black rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-semibold"
                >
                  <Send className="h-5 w-5" />
                  Send
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LearnChatbot;
