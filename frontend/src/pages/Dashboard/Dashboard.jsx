import React from 'react';
import { useSelector } from 'react-redux';
import { BookOpen, Brain, TrendingUp, Award, Clock, Target } from 'lucide-react';
import Sidebar from '../../components/Dashboard/Sidebar/Sidebar';

function Dashboard() {
    const currentUser = useSelector(state => state.auth.currentUser);
    
    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
            <Sidebar />
            <div className="flex-1 lg:ml-64">
                <div className="text-white pt-24 lg:pt-12 pb-12 px-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Welcome Section */}
                        <div className="mb-12">
                            <h1 className="text-4xl md:text-5xl font-bold mb-4">
                                Welcome back, {currentUser?.username || currentUser?.email?.split('@')[0] || 'Learner'}!
                            </h1>
                            <p className="text-xl text-gray-400">
                                Continue your learning journey with MentorX
                            </p>
                        </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-lg">
                                <BookOpen className="h-6 w-6 text-blue-400" />
                            </div>
                            <span className="text-2xl font-bold">12</span>
                        </div>
                        <h3 className="text-gray-400 text-sm">Topics Learned</h3>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-500/20 rounded-lg">
                                <Brain className="h-6 w-6 text-green-400" />
                            </div>
                            <span className="text-2xl font-bold">45</span>
                        </div>
                        <h3 className="text-gray-400 text-sm">Quizzes Completed</h3>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-purple-400" />
                            </div>
                            <span className="text-2xl font-bold">85%</span>
                        </div>
                        <h3 className="text-gray-400 text-sm">Average Score</h3>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-500/20 rounded-lg">
                                <Clock className="h-6 w-6 text-orange-400" />
                            </div>
                            <span className="text-2xl font-bold">24h</span>
                        </div>
                        <h3 className="text-gray-400 text-sm">Learning Time</h3>
                    </div>
                </div>

                {/* Recent Topics */}
                <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Target className="h-6 w-6" />
                        Continue Learning
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { title: 'Python Variables', progress: 75, color: 'blue' },
                            { title: 'React Hooks', progress: 60, color: 'green' },
                            { title: 'Machine Learning Basics', progress: 40, color: 'purple' },
                        ].map((topic, idx) => (
                            <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all cursor-pointer">
                                <h3 className="text-xl font-semibold mb-3">{topic.title}</h3>
                                <div className="mb-2">
                                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                                        <span>Progress</span>
                                        <span>{topic.progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div 
                                            className={`bg-${topic.color}-500 h-2 rounded-full transition-all`}
                                            style={{ width: `${topic.progress}%` }}
                                        />
                                    </div>
                                </div>
                                <button className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                                    Continue
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Achievements */}
                <div>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Award className="h-6 w-6" />
                        Recent Achievements
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: 'First Quiz Completed', icon: '🎯', date: 'Dec 5, 2025' },
                            { title: 'Week Streak', icon: '🔥', date: 'Dec 4, 2025' },
                            { title: 'Fast Learner', icon: '⚡', date: 'Dec 3, 2025' },
                        ].map((achievement, idx) => (
                            <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                                <div className="text-4xl mb-3">{achievement.icon}</div>
                                <h3 className="text-lg font-semibold mb-1">{achievement.title}</h3>
                                <p className="text-sm text-gray-400">{achievement.date}</p>
                            </div>
                        ))}
                    </div>
                </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;