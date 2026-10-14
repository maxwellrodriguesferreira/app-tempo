import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSanitized } from '../../shared/types.js';
import { api, ApiError } from '../services/api.js';

interface AuthContextType {
  user: UserSanitized | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSanitized | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      setUser(null);
      localStorage.removeItem('climastack_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.login(credentials);
    localStorage.setItem('climastack_token', res.token);
    setUser(res.user);
  };

  const register = async (payload: { name: string; email: string; password: string }) => {
    const res = await api.register(payload);
    localStorage.setItem('climastack_token', res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      localStorage.removeItem('climastack_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
