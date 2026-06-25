import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../../store/authSlice';
import { 
  GraduationCap, 
  BookOpenText, 
  ClipboardCheck, 
  User, 
  LogOut,
  Menu,
  X,
  FileText,
} from 'lucide-react';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    { icon: BookOpenText, label: 'Learn', path: '/learn' },
    { icon: FileText, label: 'Resources', path: '/resources' },
    { icon: BookOpenText, label: 'Test Learn', path: '/test-learn' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-black border border-white/30 hover:border-white/50 transition-all duration-200"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
      </button>

      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-black border-r border-white/20 z-40
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">MentorX</h2>
                <p className="text-xs text-gray-400">AI Learning Platform</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-white/10 border border-white/30 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-white/20">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/20"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
