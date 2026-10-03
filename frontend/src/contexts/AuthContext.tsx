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

export function AuthProvider({ children }: {children: React.ReactNode;}) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('anonymous');

  const logout = useCallback(() => {
    api.setAuthToken(null);
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
      // /auth/me is the source of truth for who is signed in.
      const me = await api.getMe();
      setUser(me);
      setToken(response.token);
      setStatus('authenticated');
    } catch (error) {
      api.setAuthToken(null);
      setToken(null);
      setUser(null);
      setStatus('anonymous');
      throw error;
    }
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