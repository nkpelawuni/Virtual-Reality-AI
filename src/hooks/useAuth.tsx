import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as authService from '@/services/auth';
import { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<authService.LoginResult>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  initializing: true,
  login: async () => ({ ok: false, error: 'Auth not ready' }),
  logout: async () => undefined,
  refreshUser: () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    authService
      .restoreSession()
      .then(setUser)
      .finally(() => setInitializing(false));
  }, []);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    const result = await authService.login(usernameOrEmail, password);
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout(user);
    setUser(null);
  }, [user]);

  const refreshUser = useCallback(() => {
    if (user) setUser(authService.getUserById(user.id));
  }, [user]);

  const value = useMemo(
    () => ({ user, initializing, login, logout, refreshUser }),
    [user, initializing, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
