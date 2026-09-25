import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearTokens, login as apiLogin, logout as apiLogout, register as apiRegister, saveTokens, tryRestoreSession } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void tryRestoreSession()
      .then((next) => {
        if (!cancelled) {
          setUser(next);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      setUser,
      async login(email, password) {
        const tokens = await apiLogin(email, password);
        saveTokens(tokens);
        setUser(tokens.user);
      },
      async register(email, password) {
        const tokens = await apiRegister(email, password);
        saveTokens(tokens);
        setUser(tokens.user);
      },
      async logout() {
        await apiLogout();
        clearTokens();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthProvider не найден');
  }
  return ctx;
}
