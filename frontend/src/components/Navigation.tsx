import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = isAuthenticated
    ? [
        { path: '/books', label: 'My Books' },
        { path: '/review', label: 'Review' },
        { path: '/progress', label: 'Progress' },
        { path: '/vocab-lists', label: 'Lists' },
        { path: '/settings', label: 'Settings' },
      ]
    : [{ path: '/', label: 'Home' }];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200" role="navigation" aria-label="Main navigation">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link 
            to={isAuthenticated ? '/books' : '/'} 
            className="text-xl md:text-2xl font-heading font-bold text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label="Lexeme home"
          >
            <span aria-hidden="true">📘</span> <span className="hidden sm:inline">Lexeme</span>
          </Link>

          <div className="flex items-center space-x-2 md:space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-2 md:px-3 py-2 rounded-md text-xs md:text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  location.pathname === item.path
                    ? 'text-primary bg-blue-50'
                    : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                }`}
                aria-current={location.pathname === item.path ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            {isAuthenticated && user && (
              <>
                <span className="text-xs md:text-sm text-gray-600 hidden sm:inline" aria-label={`Logged in as ${user.username}`}>
                  <span aria-hidden="true">👤</span> {user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  aria-label="Log out"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
