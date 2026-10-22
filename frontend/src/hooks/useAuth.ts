/* Auth Hook */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, TokenResponse, OIDCConfig } from '../types';
import { authApi, setTokens, clearTokens, getAccessToken } from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  oidcConfig: OIDCConfig | null;
  login: (redirectUri: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
  setOidcConfig: (config: OIDCConfig) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      oidcConfig: null,

      login: async (redirectUri: string) => {
        const config = get().oidcConfig;
        if (!config) {
          throw new Error('OIDC config not loaded');
        }

        // Generate PKCE code verifier and challenge
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const state = generateState();

        // Store PKCE values in sessionStorage
        sessionStorage.setItem('pkce_code_verifier', codeVerifier);
        sessionStorage.setItem('pkce_state', state);

        // Build authorization URL
        const params = new URLSearchParams({
          client_id: config.client_id,
          response_type: 'code',
          scope: config.scope,
          redirect_uri: redirectUri,
          state: state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });

        window.location.href = `${config.authorization_endpoint}?${params.toString()}`;
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore logout errors
        }
        clearTokens();
        set({ user: null, isAuthenticated: false });
        window.location.href = '/login';
      },

      checkAuth: async () => {
        const token = getAccessToken();
        if (!token) {
          set({ isLoading: false, isAuthenticated: false, user: null });
          return;
        }

        try {
          const response = await authApi.getMe();
          set({ user: response.data, isAuthenticated: true, isLoading: false });
        } catch {
          clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      setUser: (user: User) => set({ user, isAuthenticated: true }),
      setOidcConfig: (config: OIDCConfig) => set({ oidcConfig: config }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// PKCE helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(codeVerifier: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// React hook for components
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function useAuth() {
  const { user, isAuthenticated, isLoading, oidcConfig, login, logout, checkAuth, setOidcConfig } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Load OIDC config on mount
    authApi.getConfig().then((response) => {
      setOidcConfig(response.data);
    }).catch(console.error);

    // Check auth status
    checkAuth();
  }, [checkAuth, setOidcConfig]);

  // Handle OIDC callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      console.error('OIDC error:', error);
      navigate('/login?error=' + encodeURIComponent(error));
      return;
    }

    if (code && state) {
      const storedState = sessionStorage.getItem('pkce_state');
      const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

      if (state !== storedState) {
        console.error('Invalid state parameter');
        navigate('/login?error=invalid_state');
        return;
      }

      // Exchange code for tokens
      authApi.exchangeCode(code, window.location.origin + '/callback', codeVerifier || undefined)
        .then((response) => {
          setTokens(response.data);
          sessionStorage.removeItem('pkce_code_verifier');
          sessionStorage.removeItem('pkce_state');
          checkAuth();
          navigate('/');
        })
        .catch((err) => {
          console.error('Token exchange failed:', err);
          navigate('/login?error=token_exchange_failed');
        });
    }
  }, [location, navigate, checkAuth]);

  return { user, isAuthenticated, isLoading, login, logout };
}

// Add exchangeCode to authApi
authApi.exchangeCode = async (code: string, redirectUri: string, codeVerifier?: string) => {
  return api.post<TokenResponse>('/auth/callback', { code, redirect_uri: redirectUri, code_verifier: codeVerifier });
};

import api from '../api/client';