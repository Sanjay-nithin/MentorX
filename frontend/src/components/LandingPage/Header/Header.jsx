import React, { useState } from 'react';
import { GraduationCap, LogOut, UserPlus } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../../store/authSlice';
import SignInModal from '../Auth/SignInModal';

function Header() {
    const isLoggedIn = useSelector(state => state.auth.isLoggedIn);
    const dispatch = useDispatch();
    const [showAuth, setShowAuth] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
    };

    const scrollTo = (id) => {
        if (id === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
      <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/50 backdrop-blur-sm text-white p-4">
        <div className="mx-auto max-w-7xl flex justify-between items-center">
          {/* MentorX with icon */}
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold">MentorX</h1>
          </div>

          {/* Navigation */}
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
      </nav>

      {showAuth && (
        <SignInModal open={showAuth} onClose={() => setShowAuth(false)} defaultMode={'signin'} />
      )}
      </>
    );
}

export default Header;
