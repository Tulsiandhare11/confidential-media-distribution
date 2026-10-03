import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import type { AuthResponse, User } from '../types/api';

type AuthStatus = 'anonymous' | 'loading' | 'authenticated';

interface AuthContextValue {
  token: string | null;
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  establishSession: (response: AuthResponse) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'vault_token';

export function AuthProvider({ children }: {children: React.ReactNode;}) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const logout = useCallback(() => {
    api.setAuthToken(null);
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    api.onUnauthorized(logout);
    return () => api.onUnauthorized(null);
  }, [logout]);

  const establishSession = useCallback(async (response: AuthResponse) => {
    if (!response.token) throw new Error('The server did not return a session token.');
    api.setAuthToken(response.token);
    setStatus('loading');
    try {
      const me = await api.getMe();
      sessionStorage.setItem(STORAGE_KEY, response.token);
      setUser(me);
      setToken(response.token);
      setStatus('authenticated');
    } catch (error) {
      api.setAuthToken(null);
      sessionStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setUser(null);
      setStatus('anonymous');
      throw error;
    }
  }, []);

  // On first load (including refresh), try to restore a saved session.
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setStatus('anonymous');
      return;
    }
    api.setAuthToken(saved);
    api.getMe()
      .then((me) => {
        setUser(me);
        setToken(saved);
        setStatus('authenticated');
      })
      .catch(() => {
        api.setAuthToken(null);
        sessionStorage.removeItem(STORAGE_KEY);
        setStatus('anonymous');
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.login({ email, password });
      await establishSession(response);
    },
    [establishSession]
  );

  const value = useMemo(
    () => ({ token, user, status, login, establishSession, logout }),
    [token, user, status, login, establishSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}