import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client';

interface AuthContextValue {
  authenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(() => getToken() !== null);

  useEffect(() => {
    setUnauthorizedHandler(() => setAuthenticated(false));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { token } = await api.login(username, password);
    setToken(token);
    setAuthenticated(true);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const { token } = await api.register(username, password);
    setToken(token);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ authenticated, login, register, logout }),
    [authenticated, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
