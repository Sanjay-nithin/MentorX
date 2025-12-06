import React, { useState } from 'react';
import Sidebar from '../../components/Dashboard/Sidebar/Sidebar';
import { 
  FileText, 
  Send, 
  Loader2,
  CheckCircle2,
  XCircle,
  Brain,
  Award,
  AlertCircle
} from 'lucide-react';
import { finishQuiz } from '../../services/service';

function TestLearn() {
  const [sessionFilePath, setSessionFilePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!sessionFilePath.trim()) {
      setError('Please enter a session file path');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      console.log('Calling finish quiz with path:', sessionFilePath);
      const response = await finishQuiz(sessionFilePath.trim());
      console.log('Quiz Results:', response);
      setResults(response);
    } catch (err) {
      console.error('Error finishing quiz:', err);
      setError(err?.message || 'Failed to finish quiz. Please check the session file path.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSessionFilePath('');
    setResults(null);
    setError('');
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <div className="text-white pt-24 lg:pt-12 pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center gap-3">
                <FileText className="h-10 w-10 text-blue-400" />
                Test Quiz Finish Endpoint
              </h1>
              <p className="text-xl text-gray-400">
                Enter a quiz session file path to test the /finish endpoint with AI reasoning
              </p>
            </div>

            {/* Input Form */}
            <div className="bg-gradient-to-br from-gray-800/50 to-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl mb-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-lg font-semibold mb-3">
                    <FileText className="h-5 w-5 text-blue-400" />
                    Session File Path
                  </label>
                  <input
                    type="text"
                    value={sessionFilePath}
                    onChange={(e) => setSessionFilePath(e.target.value)}
                    placeholder="e.g., backend/tmp/quiz_bc4743bd-c73c-40ad-930e-1267b9ef74ac.json"
                    className="w-full px-6 py-4 bg-black/50 border border-white/20 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Paste the full path to the quiz session JSON file from backend/tmp/
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <p className="text-red-300">{error}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <Send className="h-6 w-6" />
                        Finish Quiz
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={loading}
                    className="px-6 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>
              </form>

              {/* Quick Copy Helper */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-sm text-blue-300 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Quick Tip: Copy the file path from your backend/tmp/ folder
                </p>
                <p className="text-xs text-gray-400">
                  Example format: backend/tmp/quiz_[uuid].json
                </p>
              </div>
            </div>

            {/* Results Display */}
            {results && (
              <div className="space-y-6">
                {/* Score Card */}
                <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-8">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-2 border-purple-500 mb-4">
                      <Award className="h-10 w-10 text-purple-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Quiz Results</h2>
                    {results.topic && (
                      <p className="text-xl text-gray-400">{results.topic}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-black/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-white mb-1">{results.total_questions}</div>
                      <div className="text-sm text-gray-400">Total</div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-green-400 mb-1">{results.correct_answers}</div>
                      <div className="text-sm text-gray-400">Correct</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-red-400 mb-1">{results.wrong_answers}</div>
                      <div className="text-sm text-gray-400">Wrong</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className={`text-5xl font-bold mb-2 ${
                      results.final_score_10 >= 7 ? 'text-green-400' : 
                      results.final_score_10 >= 5 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>
                      {results.final_score_10?.toFixed(1)}/10
                    </div>
                    <p className="text-gray-400">Final Score</p>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-8">
                  <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                    <Brain className="h-6 w-6 text-purple-400" />
                    AI Analysis & Recommendations
                  </h3>
                  
                  <div className="space-y-6 text-gray-300 leading-relaxed">
                    {/* Honest Feedback */}
                    {results.honest_feedback && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-2">Honest Feedback</h4>
                        <p>{results.honest_feedback}</p>
                      </div>
                    )}

                    {/* Learning Profile */}
                    {results.learning_profile && (
                      <div className="space-y-4">
                        {results.learning_profile.learning_pattern && (
                          <div>
                            <h4 className="text-purple-400 font-semibold mb-1">Learning Pattern</h4>
                            <p>{results.learning_profile.learning_pattern}</p>
                          </div>
                        )}

                        {results.learning_profile.strengths && results.learning_profile.strengths.length > 0 && (
                          <div>
                            <h4 className="text-green-400 font-semibold mb-1">Strengths</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {results.learning_profile.strengths.map((strength, idx) => (
                                <li key={idx}>{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {results.learning_profile.weaknesses && results.learning_profile.weaknesses.length > 0 && (
                          <div>
                            <h4 className="text-yellow-400 font-semibold mb-1">Areas for Improvement</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {results.learning_profile.weaknesses.map((weakness, idx) => (
                                <li key={idx}>{weakness}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {results.learning_profile.hidden_weak_concepts && results.learning_profile.hidden_weak_concepts.length > 0 && (
                          <div>
                            <h4 className="text-orange-400 font-semibold mb-1">Hidden Gaps Detected</h4>
                            <p>Our AI detected potential weaknesses in: {results.learning_profile.hidden_weak_concepts.join(', ')}</p>
                            <p className="text-sm text-gray-500 mt-1">(Inferred from answer patterns)</p>
                          </div>
                        )}

                        {results.learning_profile.focus_areas && results.learning_profile.focus_areas.length > 0 && (
                          <div>
                            <h4 className="text-blue-400 font-semibold mb-1">Priority Focus</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {results.learning_profile.focus_areas.map((area, idx) => (
                                <li key={idx}>{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Roadmap */}
                    {results.roadmap && results.roadmap.length > 0 && (
                      <div>
                        <h4 className="text-cyan-400 font-semibold mb-2">Recommended Next Steps</h4>
                        <ol className="list-decimal list-inside space-y-2">
                          {results.roadmap.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Next Topic */}
                    {results.next_topic_suggestion && results.next_topic_suggestion.topic && (
                      <div>
                        <h4 className="text-indigo-400 font-semibold mb-1">Next Topic to Study</h4>
                        <p className="font-semibold">{results.next_topic_suggestion.topic}</p>
                        {results.next_topic_suggestion.reason && (
                          <p className="text-gray-400 text-sm mt-1">{results.next_topic_suggestion.reason}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mistakes Detail */}
                {results.mistakes_detail && results.mistakes_detail.length > 0 && (
                  <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-500/30 rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-400" />
                      Mistakes Review ({results.mistakes_detail.length})
                    </h3>
                    <div className="space-y-4">
                      {results.mistakes_detail.map((mistake, idx) => (
                        <div key={idx} className="bg-black/50 rounded-xl p-4">
                          <p className="text-white font-semibold mb-3">{mistake.question}</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                              <span className="text-red-400 font-semibold whitespace-nowrap">Your answer:</span>
                              <span className="text-gray-300">{mistake.user_answer}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-green-400 font-semibold whitespace-nowrap">Correct answer:</span>
                              <span className="text-gray-300">{mistake.correct_answer}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-blue-400 font-semibold whitespace-nowrap">Explanation:</span>
                              <span className="text-gray-300">{mistake.reason}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON for Debugging */}
                <details className="bg-gray-900 border border-white/10 rounded-xl p-4">
                  <summary className="cursor-pointer font-semibold text-white hover:text-gray-300 transition-colors">
                    View Raw JSON Response
                  </summary>
                  <pre className="mt-4 p-4 bg-black rounded-lg text-xs text-green-400 overflow-x-auto">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestLearn;
