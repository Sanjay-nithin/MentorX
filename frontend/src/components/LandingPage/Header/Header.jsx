import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, UserPlus } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../../store/authSlice';
import SignInModal from '../Auth/SignInModal';

function Header() {
    const isLoggedIn = useSelector(state => state.auth.isLoggedIn);
    const dispatch = useDispatch();
    	const navigate = useNavigate();
    const [showAuth, setShowAuth] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        setIsMobileMenuOpen(false);
    };

    const scrollTo = (id) => {
        if (id === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setIsMobileMenuOpen(false);
          return;
        }
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setIsMobileMenuOpen(false);
        }
    };

    // Close mobile menu on Escape
    useEffect(() => {
      const onKey = (e) => {
        if (e.key === 'Escape') setIsMobileMenuOpen(false);
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
      <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/50 backdrop-blur-sm text-white p-4">
        <div className="mx-auto max-w-7xl flex justify-between items-center">
          {/* MentorX with icon */}
          <div className="flex items-center space-x-2">
            <button onClick={() => navigate('/')} className="flex items-center">
            <GraduationCap className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold">MentorX</h1>
            </button>
          </div>

          {/* Navigation */}
          <div className="hidden md:block">
            <ul className="flex space-x-8 items-center">
              <li onClick={() => scrollTo('top')} className="relative cursor-pointer group">
                <span className="group-hover:text-white/90">Home</span>
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-white shadow-[0_4px_20px_rgba(255,255,255,0.8)] group-hover:w-full transition-all duration-300"></div>
              </li>
              <li onClick={() => scrollTo('features')} className="relative cursor-pointer group">
                <span className="group-hover:text-white/90">Features</span>
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-white shadow-[0_4px_20px_rgba(255,255,255,0.8)] group-hover:w-full transition-all duration-300"></div>
              </li>
              <li onClick={() => scrollTo('contact')} className="relative cursor-pointer group">
                <span className="group-hover:text-white/90">Contact</span>
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-white shadow-[0_4px_20px_rgba(255,255,255,0.8)] group-hover:w-full transition-all duration-300"></div>
              </li>
              {isLoggedIn ? (
                <li onClick={handleLogout} className="cursor-pointer px-6 py-2.5 bg-white text-black hover:bg-gray-100 transition-colors duration-300 flex items-center space-x-2 font-semibold">
                  <LogOut className="h-5 w-5" />
                  <span>Log Out</span>
                </li>
              ) : (
                <li onClick={() => setShowAuth(true)} className="cursor-pointer px-6 py-2.5 bg-white text-black hover:bg-gray-100 transition-colors duration-300 flex items-center space-x-2 font-semibold">
                  <UserPlus className="h-5 w-5" />
                  <span>Sign Up</span>
                </li>
              )}
            </ul>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden inline-flex flex-col items-center justify-center rounded-md p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white gap-1"
            aria-label="Open menu"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
          >
            {/* Hamburger icon with proper structure */}
            <span className="block w-6 h-0.5 bg-white"></span>
            <span className="block w-6 h-0.5 bg-white"></span>
            <span className="block w-6 h-0.5 bg-white"></span>
          </button>
        </div>
      </nav>

      {/* Mobile side panel */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop with fade-in animation */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Panel with slide-in animation */}
          <div className="fixed top-0 right-0 z-50 h-full w-64 bg-black text-white shadow-xl p-6 flex flex-col space-y-6 animate-slideInRight">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-6 w-6" />
                <span className="font-semibold">MentorX</span>
              </div>
              <button
                className="text-white hover:text-gray-300 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <nav className="flex flex-col space-y-4">
              <button onClick={() => scrollTo('top')} className="text-left hover:text-gray-200 transition-colors">Home</button>
              <button onClick={() => scrollTo('features')} className="text-left hover:text-gray-200 transition-colors">Features</button>
              <button onClick={() => scrollTo('contact')} className="text-left hover:text-gray-200 transition-colors">Contact</button>
            </nav>

            <div className="mt-auto">
              {isLoggedIn ? (
                <button onClick={handleLogout} className="w-full px-4 py-2.5 bg-white text-black font-semibold hover:bg-gray-100 transition-colors">Log Out</button>
              ) : (
                <button onClick={() => { setIsMobileMenuOpen(false); setShowAuth(true); }} className="w-full px-4 py-2.5 bg-white text-black font-semibold hover:bg-gray-100 transition-colors">Sign Up</button>
              )}
            </div>
          </div>
        </>
      )}

      {showAuth && (
        <SignInModal open={showAuth} onClose={() => setShowAuth(false)} defaultMode={'signin'} />
      )}
      </>
    );
}

export default Header;
