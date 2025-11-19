import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, isAuthenticated]);

  const navItems = isAuthenticated
    ? [
        { path: '/books', label: 'My Books' },
        { path: '/review', label: 'Review' },
        { path: '/progress', label: 'Progress' },
        { path: '/vocab-lists', label: 'Lists' },
        { path: '/settings', label: 'Settings' },
      ]
    : [{ path: '/', label: 'Home' }];

  const renderNavLink = (item: { path: string; label: string }, variant: 'desktop' | 'mobile' = 'desktop') => {
    const isActive = location.pathname === item.path;
    const baseClasses =
      variant === 'desktop'
        ? 'px-2 md:px-3 py-2 rounded-md text-xs md:text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        : 'block px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
    const activeClasses = isActive ? 'text-primary bg-blue-50' : 'text-gray-600 hover:text-primary hover:bg-gray-50';
    return (
      <Link
        key={`${variant}-${item.path}`}
        to={item.path}
        onClick={() => setIsMenuOpen(false)}
        className={`${baseClasses} ${activeClasses}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:left-4 focus:top-4 focus:bg-white focus:text-primary focus:px-4 focus:py-2 focus:rounded focus:shadow-lg"
      >
        Skip to main content
      </a>
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
              <button
                type="button"
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 md:hidden"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-nav"
                aria-label="Toggle navigation menu"
              >
                {isMenuOpen ? (
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>

              <div className="hidden md:flex items-center space-x-2 md:space-x-4">
                {navItems.map((item) => renderNavLink(item))}
                {isAuthenticated && user && (
                  <>
                    <span className="text-sm text-gray-600" aria-label={`Logged in as ${user.username}`}>
                      <span aria-hidden="true">👤</span> {user.username}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                      aria-label="Log out"
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            id="mobile-nav"
            className={`md:hidden border-t border-gray-100 ${isMenuOpen ? 'block' : 'hidden'}`}
            aria-label="Mobile navigation"
          >
            <div className="py-3 space-y-1">
              {navItems.map((item) => renderNavLink(item, 'mobile'))}
              {isAuthenticated && user && (
                <div className="px-3 pt-2">
                  <p className="text-sm text-gray-600 mb-2">
                    Logged in as <span className="font-medium">{user.username}</span>
                  </p>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
