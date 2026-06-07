import React, { createContext, useContext, useState } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USERS: Record<string, { password: string; user: User }> = {
  admin: {
    password: '1234',
    user: { id: 'u1', username: 'admin', name: 'Admin User', role: 'admin', email: 'admin@arptankpro.com', active: true },
  },
  partner: {
    password: '1234',
    user: { id: 'u2', username: 'partner', name: 'Ramesh Shah', role: 'partner', email: 'partner@arptankpro.com', active: true },
  },
  staff: {
    password: '1234',
    user: { id: 'u3', username: 'staff', name: 'Kiran Mehta', role: 'staff', email: 'staff@arptankpro.com', active: true },
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('arp_tankpro_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (username: string, password: string): boolean => {
    const creds = USERS[username];
    if (creds && creds.password === password) {
      setUser(creds.user);
      localStorage.setItem('arp_tankpro_user', JSON.stringify(creds.user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('arp_tankpro_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
