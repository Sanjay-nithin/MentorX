import React, { useState } from 'react';
import { X, UserPlus, LogIn, ShieldCheck, Mail, Lock, Chrome, User } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '../../../store/authSlice';
import { signInWithGoogle } from '../../../firebase';
import { loginUser, registerUser, setTokens } from '../../../services/service';

export default function SignInModal({ open, onClose, defaultMode = 'signin' }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mode, setMode] = useState(defaultMode); // 'signin' | 'signup'
  const [loadingForm, setLoadingForm] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleGoogle = async () => {
    setError('');
    setLoadingGoogle(true);
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      const accessToken = await user.getIdToken();
      dispatch(
        loginSuccess({
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            provider: 'google',
          },
          accessToken,
          refreshToken: user.refreshToken,
        })
      );
      onClose?.();
      navigate('/dashboard');
    } catch (e) {
      setError(e?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`relative w-full bg-white text-black shadow-2xl border border-black/10 rounded-lg ${mode === 'signup' ? 'max-w-lg' : 'max-w-xl'}`}
        style={{ minHeight: mode === 'signup' ? '58vh' : '66vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-6 border-b border-black/10">
          <div className="flex items-center gap-2">
            {mode === 'signin' ? <LogIn className="h-6 w-6" /> : <UserPlus className="h-6 w-6" />}
            <h3 className="text-3xl font-extrabold text-black">{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="px-10 py-8 space-y-6">
          <p className="text-lg md:text-xl text-black font-semibold">
            Welcome to MentorX. Use Google to {mode === 'signin' ? 'sign in' : 'create your account'} quickly.
          </p>
          {/* Email form using service.js login/register */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setLoadingForm(true);
              const form = e.currentTarget;
              const email = form.querySelector('input[type="email"]').value;
              const password = form.querySelector('input[type="password"]').value;
              const username = mode === 'signup' ? form.querySelector('input[name="username"]')?.value : null;
              try {
                const payload = mode === 'signup' 
                  ? { email, password, username } 
                  : { email, password };
                const data = mode === 'signin' ? await loginUser(payload) : await registerUser(payload);
                // Expecting backend to return { access_token, refresh_token, user }
                if (data?.access_token && data?.refresh_token) {
                  setTokens(data.access_token, data.refresh_token);
                }
                if (data?.user) {
                  dispatch(
                    loginSuccess({
                      user: data.user,
                      accessToken: data.access_token,
                      refreshToken: data.refresh_token,
                    })
                  );
                }
                onClose?.();
                navigate('/dashboard');
              } catch (err) {
                setError(err?.message || 'Authentication failed. Please try again.');
              } finally {
                setLoadingForm(false);
              }
            }}
            className="space-y-4"
          >
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="block text-black font-semibold text-base">Username</label>
                <div className="flex items-center gap-3 border border-black px-5 py-4 rounded-md">
                  <User className="h-5 w-5" />
                  <input
                    type="text"
                    name="username"
                    placeholder="Choose a username"
                    className="w-full outline-none placeholder:text-gray-500 text-black text-lg"
                    required
                    minLength={3}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="block text-black font-semibold text-base">Email</label>
              <div className="flex items-center gap-3 border border-black px-5 py-4 rounded-md">
                <Mail className="h-5 w-5" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full outline-none placeholder:text-gray-500 text-black text-lg"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-black font-semibold text-base">Password</label>
              <div className="flex items-center gap-3 border border-black px-5 py-4 rounded-md">
                <Lock className="h-5 w-5" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="w-full outline-none placeholder:text-gray-500 text-black text-lg"
                  required
                />
              </div>
            </div>
            {/* Primary sign-in button (strong black) */}
            <button
              type="submit"
              className={`w-full bg-black text-white ${mode === 'signup' ? 'px-5 py-3 text-base' : 'px-6 py-4 text-lg'} font-semibold hover:bg-black/90 rounded-md disabled:opacity-60`}
              disabled={loadingForm || loadingGoogle}
            >
              {loadingForm ? 'Processing...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          {/* Google Button placed below sign-in */}
          <button
            onClick={handleGoogle}
            disabled={loadingGoogle || loadingForm}
            className="w-full inline-flex items-center justify-center gap-2 bg-transparent text-black px-6 py-4 text-lg font-semibold border border-black hover:bg-black/5 transition-colors rounded-md disabled:opacity-60"
          >
            <Chrome className="h-5 w-5" />
            <span>{loadingGoogle ? 'Processing...' : 'Continue with Google'}</span>
          </button>

          {error && <div className="text-sm text-red-600">{error}</div>}

          {/* Toggle */}
          <div className="text-base text-black font-semibold">
            {mode === 'signin' ? (
              <span>
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="underline">Sign Up</button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button onClick={() => setMode('signin')} className="underline">Sign In</button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-black/80">
            <ShieldCheck className="h-5 w-5" />
            <span>Secure authentication via Google OAuth.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
