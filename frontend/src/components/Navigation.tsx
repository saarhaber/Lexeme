import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const isNavItemActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const getNavItemClasses = (path: string, variant: 'desktop' | 'mobile' = 'desktop') => {
    const baseClasses =
      'rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
    const sizeClasses =
      variant === 'desktop' ? 'px-2 md:px-3 py-2 text-xs md:text-sm' : 'w-full px-3 py-2 text-base';
    const stateClasses = isNavItemActive(path) ? 'text-primary bg-blue-50' : 'text-gray-600 hover:text-primary hover:bg-gray-50';
    return `${sizeClasses} ${baseClasses} ${stateClasses}`;
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

          <div className="hidden md:flex items-center space-x-2 md:space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={getNavItemClasses(item.path, 'desktop')}
                aria-current={isNavItemActive(item.path) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            {isAuthenticated && user && (
              <>
                <span className="text-xs md:text-sm text-gray-600" aria-label={`Logged in as ${user.username}`}>
                  <span aria-hidden="true">👤</span> {user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  aria-label="Log out"
                  type="button"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center space-x-3">
            {isAuthenticated && user && (
              <span className="text-sm text-gray-600" aria-label={`Logged in as ${user.username}`}>
                <span aria-hidden="true">👤</span>
              </span>
            )}
            <button
              type="button"
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <div
          id="mobile-navigation"
          className={`md:hidden border-t border-gray-200 ${isMobileMenuOpen ? 'block' : 'hidden'}`}
          aria-hidden={!isMobileMenuOpen}
        >
          <div className="py-3 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={getNavItemClasses(item.path, 'mobile')}
                aria-current={isNavItemActive(item.path) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            {isAuthenticated && user && (
              <div className="flex flex-col space-y-2 pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-600 px-3" aria-label={`Logged in as ${user.username}`}>
                  <span aria-hidden="true">👤</span> {user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Log out"
                  type="button"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
