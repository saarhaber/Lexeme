import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

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
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate("/");
  };

  const navItems = useMemo<NavItem[]>(() => {
    if (!isAuthenticated) {
      return [{ path: "/", label: "Home", icon: "🏠" }];
    }

    return [
      {
        path: "/books",
        label: "Books",
        icon: "📚",
        match: (pathname) =>
          pathname === "/books" || pathname.startsWith("/book/"),
      },
      { path: "/review", label: "Review", icon: "🔁" },
      { path: "/progress", label: "Progress", icon: "📈" },
      {
        path: "/vocab-lists",
        label: "Lists",
        icon: "📝",
        match: (pathname) => pathname.startsWith("/vocab-lists"),
      },
      { path: "/settings", label: "Settings", icon: "⚙️" },
    ];
  }, [isAuthenticated]);

  const isItemActive = (item: NavItem) => {
    if (item.match) {
      return item.match(location.pathname);
    }
    return location.pathname === item.path;
  };

  const bottomNavItems = navItems.filter((item) =>
    ["/books", "/review", "/progress", "/settings"].includes(item.path),
  );

  return (
    <>
      <nav
        className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-md"
        role="navigation"
        aria-label="Primary"
        style={{ paddingTop: "calc(var(--safe-area-top) + 0.25rem)" }}
      >
        <div
          className="mx-auto flex w-full items-center justify-between gap-3 px-4 phone:px-5 pb-3"
          style={{ maxWidth: "var(--app-max-width)" }}
        >
          <Link
            to={isAuthenticated ? "/books" : "/"}
            className="flex items-center gap-2 text-lg font-heading font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Lexeme home"
          >
            <span className="text-2xl" aria-hidden="true">
              📘
            </span>
            <span className="text-xl sm:text-2xl">Lexeme</span>
          </Link>

          {isAuthenticated && (
            <button
              onClick={() => navigate("/books")}
              className="hidden rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:inline-flex"
            >
              My Library
            </button>
          )}

          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                <div className="hidden flex-col text-right text-xs font-medium text-gray-500 sm:flex">
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">
                    Signed in
                  </span>
                  <span className="text-sm text-gray-900">{user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="hidden rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:inline-flex"
                >
                  Logout
                </button>
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-xl text-gray-700 transition hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:hidden"
                  aria-label="Open menu"
                >
                  ☰
                </button>
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

        <div
          className="mx-auto w-full overflow-x-auto px-4 phone:px-5 pb-3"
          style={{ maxWidth: "var(--app-max-width)" }}
        >
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const active = isItemActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.icon && (
                    <span className="text-lg" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {isAuthenticated && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-md sm:hidden"
          role="navigation"
          aria-label="Quick actions"
          style={{ paddingBottom: "calc(0.5rem + var(--safe-area-bottom))" }}
        >
          <div
            className="mx-auto flex w-full items-center justify-around px-6 pt-3"
            style={{ maxWidth: "var(--app-max-width)" }}
          >
            {bottomNavItems.map((item) => {
              const active = isItemActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center text-xs font-semibold transition ${
                    active
                      ? "text-blue-600"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={`mb-1 flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                      active ? "bg-blue-50" : "bg-gray-100"
                    }`}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {isAuthenticated && isMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Account menu"
          onClick={closeMenu}
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-6 shadow-soft-card"
            style={{ maxWidth: "var(--app-max-width)", margin: "0 auto" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Signed in as
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {user?.username}
                </p>
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
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-base font-medium transition ${
                      active
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
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
              className="mt-6 flex w-full items-center justify-center rounded-2xl bg-gray-900 py-3 text-base font-semibold text-white transition hover:bg-gray-800"
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
