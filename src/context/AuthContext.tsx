import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface Teacher {
  id: string;
  email: string;
  name: string;
}

interface AuthCtx {
  teacher: Teacher | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);
const API = 'http://localhost:3001/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('qb_token'));

  useEffect(() => {
    if (token) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setTeacher(data.teacher))
        .catch(() => { localStorage.removeItem('qb_token'); setToken(null); });
    }
  }, [token]);

  async function login(email: string, password: string) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('qb_token', data.token);
    setToken(data.token);
    setTeacher(data.teacher);
  }

  async function register(name: string, email: string, password: string) {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('qb_token', data.token);
    setToken(data.token);
    setTeacher(data.teacher);
  }

  function logout() {
    localStorage.removeItem('qb_token');
    setToken(null);
    setTeacher(null);
  }

  return (
    <AuthContext.Provider value={{ teacher, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
