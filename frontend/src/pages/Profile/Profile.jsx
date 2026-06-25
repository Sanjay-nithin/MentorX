import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Sidebar from '../../components/Dashboard/Sidebar/Sidebar';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Edit2, 
  Save, 
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Award,
  Target
} from 'lucide-react';
import { getCurrentUser, updateProfile } from '../../services/service';

export default function Profile() {
  const authUser = useSelector(state => state.auth.user);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    gender: '',
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCurrentUser();
      setUser(data);
      setFormData({
        username: data.username || '',
        phone: data.phone || '',
        gender: data.gender || '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load profile');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Prepare payload (only send changed fields)
      const payload = {};
      if (formData.username !== user.username) payload.username = formData.username;
      if (formData.phone !== user.phone) payload.phone = formData.phone;
      if (formData.gender !== user.gender) payload.gender = formData.gender;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      await updateProfile(payload);
      
      // Refresh user data
      await fetchUserProfile();
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user.username || '',
      phone: user.phone || '',
      gender: user.gender || '',
    });
    setIsEditing(false);
    setError('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-black">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <div className="min-h-screen p-6 pt-24 lg:pt-12">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <div className="min-h-screen p-6 pt-24 lg:pt-12">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <User className="w-10 h-10 text-white" />
                My Profile
              </h1>
              <p className="text-gray-400">
                Manage your account information and preferences
              </p>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-white/5 border border-white/30 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
                <p className="text-white font-medium">{success}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-black border border-white/30 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
                <p className="text-white">{error}</p>
              </div>
            )}

            {/* Profile Card */}
            <div className="bg-black border border-white/20 rounded-2xl overflow-hidden mb-6">
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-white/10 to-white/5 p-8 border-b border-white/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-6">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-black text-3xl font-bold">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    
                    {/* User Info */}
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">
                        {user?.username || 'User'}
                      </h2>
                      <p className="text-gray-400 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  {/* Edit Button */}
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Profile Details */}
              <div className="p-8">
                <div className="space-y-6">
                  {/* Username */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Username
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-black border border-white/20 rounded-xl text-white focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all"
                        placeholder="Enter username"
                      />
                    ) : (
                      <p className="text-lg text-white">{user?.username || 'Not set'}</p>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Email Address
                    </label>
                    <p className="text-lg text-white">{user?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-black border border-white/20 rounded-xl text-white focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all"
                        placeholder="Enter phone number (10-15 digits)"
                        pattern="[0-9]{10,15}"
                      />
                    ) : (
                      <p className="text-lg text-white">{user?.phone || 'Not set'}</p>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Gender
                    </label>
                    {isEditing ? (
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-black border border-white/20 rounded-xl text-white focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    ) : (
                      <p className="text-lg text-white capitalize">{user?.gender || 'Not set'}</p>
                    )}
                  </div>

                  {/* Member Since */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Member Since
                    </label>
                    <p className="text-lg text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  {isEditing && (
                    <div className="flex gap-3 pt-4 border-t border-white/20">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            Save Changes
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <X className="w-5 h-5" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black border border-white/20 rounded-xl p-6 hover:border-white/40 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-8 h-8 text-white" />
                  <h3 className="text-lg font-semibold text-white">Resources</h3>
                </div>
                <p className="text-3xl font-bold text-white">{user?.resources?.length || 0}</p>
                <p className="text-sm text-gray-400 mt-1">Generated PDFs</p>
              </div>

              <div className="bg-black border border-white/20 rounded-xl p-6 hover:border-white/40 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-8 h-8 text-white" />
                  <h3 className="text-lg font-semibold text-white">Quizzes</h3>
                </div>
                <p className="text-3xl font-bold text-white">Coming Soon</p>
                <p className="text-sm text-gray-400 mt-1">Total Completed</p>
              </div>

              <div className="bg-black border border-white/20 rounded-xl p-6 hover:border-white/40 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-8 h-8 text-white" />
                  <h3 className="text-lg font-semibold text-white">Progress</h3>
                </div>
                <p className="text-3xl font-bold text-white">Coming Soon</p>
                <p className="text-sm text-gray-400 mt-1">Learning Streak</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
