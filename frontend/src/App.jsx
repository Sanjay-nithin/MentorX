import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Layout from './layout/Layout';
import LandingPage from './pages/LandingPage/LandingPage';
import LearnChatbot from './pages/Learn/LearnChatbot';
import TestLearn from './pages/TestLearn/TestLearn';
import Resources from './pages/Resources/Resources';
import { ParticlesProvider } from './contexts/ParticlesContext';
import { loginSuccess, logout } from './store/authSlice';
import { getAccessToken, getRefreshToken, getCurrentUser, clearTokens } from './services/service';
import './App.css';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const isLoggedIn = useSelector(state => state.auth.isLoggedIn);
  return isLoggedIn ? children : <Navigate to="/" replace />;
}

function App() {
  const dispatch = useDispatch();

  // Initialize auth state on app load
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      
      if (accessToken && refreshToken) {
        try {
          // Validate token by fetching current user
          const userData = await getCurrentUser();
          
          if (userData) {
            dispatch(
              loginSuccess({
                user: userData,
                accessToken,
                refreshToken,
              })
            );
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          // Clear invalid tokens
          clearTokens();
          dispatch(logout());
        }
      }
    };

    initAuth();
  }, [dispatch]);

  return (
    <BrowserRouter>
      <ParticlesProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/learn"
              element={
                <ProtectedRoute>
                  <LearnChatbot />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test-learn"
              element={
                <ProtectedRoute>
                  <TestLearn />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources"
              element={
                <ProtectedRoute>
                  <Resources />
                </ProtectedRoute>
              }
            />
            {/* Redirect any unknown routes to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ParticlesProvider>
    </BrowserRouter>
  );
}

export default App;
