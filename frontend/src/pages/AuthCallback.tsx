import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();

  useEffect(() => {
    // The AuthContext already handles the token from URL params
    // Just wait a moment and redirect
    if (token && user) {
      setTimeout(() => {
        navigate('/books');
      }, 500);
    } else {
      // If no token, redirect to home
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  }, [token, user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign-in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

