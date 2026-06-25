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
import { finishQuiz, generatePDFNotes } from '../../services/service';

function TestLearn() {
  const [sessionFilePath, setSessionFilePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!sessionFilePath.trim()) {
      setError('Please enter a session file path');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);
    setPdfGenerated(false);

    try {
      console.log('Calling finish quiz with path:', sessionFilePath);
      const response = await finishQuiz(sessionFilePath.trim());
      console.log('Quiz Results:', response);
      setResults(response);
      
      // Check if PDF was auto-generated (finishQuiz internally calls generatePDFNotes)
      // Wait a bit to ensure PDF generation completes
      setTimeout(() => {
        setPdfGenerated(true);
        console.log('PDF auto-generated after quiz completion');
      }, 2000);
      
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
    setGeneratingPDF(false);
    setPdfGenerated(false);
  };

  const handleGeneratePDF = async () => {
    if (!results || !sessionFilePath) {
      alert('Quiz results not available');
      return;
    }

    setGeneratingPDF(true);

    try {
      await generatePDFNotes(sessionFilePath.trim(), results);
      setPdfGenerated(true);
      alert('✅ PDF Notes Generated Successfully!\n\nYour study notes have been created and saved to your Resources. You can access them from the Resources page.');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('❌ Failed to Generate PDF\n\n' + (error.message || 'An error occurred while generating the PDF. Please try again.'));
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <div className="text-white pt-24 lg:pt-12 pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center gap-3">
                <FileText className="h-10 w-10 text-white" />
                Test Quiz Finish Endpoint
              </h1>
              <p className="text-xl text-gray-400">
                Enter a quiz session file path to test the /finish endpoint with AI reasoning
              </p>
            </div>

            {/* Input Form */}
            <div className="bg-black border border-white/20 rounded-2xl p-8 mb-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-lg font-semibold mb-3">
                    <FileText className="h-5 w-5 text-white" />
                    Session File Path
                  </label>
                  <input
                    type="text"
                    value={sessionFilePath}
                    onChange={(e) => setSessionFilePath(e.target.value)}
                    placeholder="e.g., backend/tmp/quiz_bc4743bd-c73c-40ad-930e-1267b9ef74ac.json"
                    className="w-full px-6 py-4 bg-black border border-white/20 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all font-mono text-sm"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Paste the full path to the quiz session JSON file from backend/tmp/
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-black border border-white/30 rounded-xl flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-white flex-shrink-0" />
                    <p className="text-white">{error}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 px-6 bg-white text-black hover:bg-gray-200 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="px-6 py-4 bg-white/10 border border-white/20 hover:bg-white/20 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>
              </form>

              {/* Quick Copy Helper */}
              <div className="mt-6 p-4 bg-white/5 border border-white/20 rounded-xl">
                <p className="text-sm text-white mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Quick Tip: Copy the file path from your backend/tmp/ folder
                </p>
                <p className="text-xs text-gray-400">
                  Example format: backend/tmp/quiz_[uuid].json
                </p>
              </div>
            </div>

            {/* Results Display */}
            {/* Results Display */}
            {results && (
              <div className="space-y-6">
                {/* PDF Auto-Generation Success Alert */}
                {pdfGenerated && (
                  <div className="bg-white/5 border border-white/30 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-white flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold">✅ PDF Notes Generated Successfully!</p>
                      <p className="text-gray-400 text-sm mt-1">Your study materials have been saved. Check the Resources page to access them.</p>
                    </div>
                  </div>
                )}
                
                {/* Score Card */}
                <div className="bg-black border border-white/20 rounded-2xl p-8">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black border-2 border-white mb-4">
                      <Award className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Quiz Results</h2>
                    {results.topic && (
                      <p className="text-xl text-gray-400">{results.topic}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-black border border-white/20 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-white mb-1">{results.total_questions}</div>
                      <div className="text-sm text-gray-400">Total</div>
                    </div>
                    <div className="bg-black border border-white/20 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-white mb-1">{results.correct_answers}</div>
                      <div className="text-sm text-gray-400">Correct</div>
                    </div>
                    <div className="bg-black border border-white/20 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-white mb-1">{results.wrong_answers}</div>
                      <div className="text-sm text-gray-400">Wrong</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2 text-white">
                      {results.final_score_10?.toFixed(1)}/10
                    </div>
                    <p className="text-gray-400">Final Score</p>
                  </div>

                  {/* PDF Eligibility & Generation Button */}
                  {results.pdf_eligibility && (
                    <div className={`mt-6 p-4 rounded-xl border ${
                      results.pdf_eligibility.eligible
                        ? 'bg-white/5 border-white/30'
                        : 'bg-white/5 border-white/20'
                    }`}>
                      <p className="text-white text-sm mb-3">{results.pdf_eligibility.message}</p>
                      
                      {/* Generate PDF Button */}
                      {results.pdf_eligibility.eligible && !pdfGenerated && (
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

                {/* AI Analysis */}
                <div className="bg-black border border-white/20 rounded-2xl p-8">
                  <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                    <Brain className="h-6 w-6 text-white" />
                    AI Analysis & Recommendations
                  </h3>
                  
                  <div className="space-y-6 text-gray-400 leading-relaxed">
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
