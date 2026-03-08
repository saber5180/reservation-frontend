import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';

export type UserRole = 'CLIENT' | 'ADMIN';

export interface User {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  role: UserRole;
  createdAt: string;
}

interface Ctx {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  sendOtp:   (phone: string) => Promise<string | undefined>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  adminLogin:(email: string, password: string) => Promise<void>;
  updateMe:  (data: { name?: string; email?: string }) => Promise<void>;
  logout:    () => void;
}

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [token,     setToken]     = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get<User>('/auth/me')
        .then(setUser)
        .catch(() => { localStorage.removeItem('token'); setToken(null); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const save = (t: string, u: User) => {
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
  };

  const sendOtp = async (phone: string) => {
    const r = await api.post<{ message: string; otp?: string }>('/auth/send-otp', { phone });
    return r.otp;
  };

  const verifyOtp = async (phone: string, code: string) => {
    const r = await api.post<{ access_token: string; user: User }>('/auth/verify-otp', { phone, code });
    save(r.access_token, r.user);
  };

  const adminLogin = async (email: string, password: string) => {
    const r = await api.post<{ access_token: string; user: User }>('/auth/admin/login', { email, password });
    save(r.access_token, r.user);
  };

  const updateMe = async (data: { name?: string; email?: string }) => {
    const u = await api.patch<User>('/auth/me', data);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, sendOtp, verifyOtp, adminLogin, updateMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
