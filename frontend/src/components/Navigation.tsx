import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LogoMark from '../logo.svg';

type NavItem = {
  path: string;
  label: string;
  icon?: string;
  match?: (pathname: string) => boolean;
};

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, isAuthenticated]);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate('/');
  };

  const navItems = useMemo<NavItem[]>(() => {
    if (!isAuthenticated) {
      return [];
    }

    return [
      {
        path: '/books',
        label: 'Books',
        icon: '📚',
        match: (pathname) => pathname === '/books' || pathname.startsWith('/book/'),
      },
      {
        path: '/vocab-lists',
        label: 'Lists',
        icon: '🗂️',
        match: (pathname) => pathname.startsWith('/vocab-lists'),
      },
      { path: '/progress', label: 'Progress', icon: '📈' },
    ];
  }, [isAuthenticated]);

  const isItemActive = (item: NavItem) => {
    if (item.match) {
      return item.match(location.pathname);
    }
    return location.pathname === item.path;
  };

  const hasMenu = isAuthenticated && navItems.length > 0;

  return (
    <>
      <nav
        className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_10px_35px_rgba(15,23,42,0.08)] supports-[backdrop-filter]:bg-white/70"
        role="navigation"
        aria-label="Primary"
        style={{ paddingTop: 'calc(var(--safe-area-top) + 0.25rem)' }}
      >
        <div
          className="mx-auto flex w-full items-center justify-between gap-3 px-4 phone:px-5 py-3"
          style={{ maxWidth: 'var(--app-max-width)' }}
        >
          <Link
            to={isAuthenticated ? '/books' : '/'}
            className="flex items-center gap-3 text-lg font-heading font-bold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Lexeme home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 shadow-inner ring-1 ring-blue-100">
              <img src={LogoMark} alt="Lexeme logo" className="h-7 w-7" />
            </span>
            <span className="text-xl sm:text-2xl">Lexeme</span>
          </Link>

          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                <div className="hidden flex-col text-right text-xs font-medium text-gray-500 sm:flex">
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">Signed in</span>
                  <span className="text-sm text-gray-900">{user.username}</span>
                </div>
                {hasMenu && (
                  <button
                    onClick={() => setIsMenuOpen(true)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-xl text-gray-700 transition hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="Open menu"
                    aria-expanded={isMenuOpen}
                  >
                    ☰
                  </button>
                )}
              </>
            ) : (
              <Link
                to="/"
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

      </nav>

      {hasMenu && isMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          onClick={closeMenu}
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-6 shadow-soft-card"
            style={{ maxWidth: 'var(--app-max-width)', margin: '0 auto' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Signed in as</p>
                <p className="text-lg font-semibold text-gray-900">{user?.username}</p>
              </div>
              <button
                onClick={closeMenu}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-xl text-gray-700"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {navItems.map((item) => {
                const active = isItemActive(item);
                return (
                  <Link
                    key={`${item.path}-drawer`}
                    to={item.path}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? 'border-blue-500/80 bg-blue-50 text-blue-700 shadow-[0_8px_20px_rgba(59,130,246,0.16)]'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <button
              onClick={handleLogout}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
