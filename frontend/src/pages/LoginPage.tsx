/* Login Page */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, Input } from '../components/ui';
import { Loader2 } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  const errorParam = new URLSearchParams(location.search).get('error');
  if (errorParam) {
    setError(decodeURIComponent(errorParam));
  }

  const handleLogin = async () => {
    setError('');
    try {
      // Redirect to the current origin + /callback for OIDC
      await login(window.location.origin + '/callback');
    } catch (err) {
      setError('Failed to initiate login. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">axiom-hub</h1>
          <p className="text-neutral-500 mt-2">The design language that makes your AI harness better at design</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-1">Sign in</h2>
          <p className="text-neutral-500 mb-6">Continue with your organization account</p>

          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm" role="alert">
              {error}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleLogin}
          >
            <Loader2 className="w-5 h-5" aria-hidden="true" />
            Continue with Keycloak
          </Button>

          <p className="mt-6 text-center text-sm text-neutral-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          axiom-hub-ryan-vo v1.0.0 &copy; 2024 Ryan Vo
        </p>
      </div>
    </div>
  );
};