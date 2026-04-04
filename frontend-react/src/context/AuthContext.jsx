import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, getUser, getUserRole, login as loginRequest, logout as logoutRequest, register as registerRequest } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());
  const [role, setRole] = useState(getUserRole());
  const [ready, setReady] = useState(true);

  useEffect(() => {
    setUser(getUser());
    setRole(getUserRole());
  }, []);

  const value = useMemo(() => ({
    user,
    role,
    ready,
    async login(payload) {
      const data = await loginRequest(payload);
      setUser(data.user);
      setRole(data.user.role);
      return data;
    },
    async register(payload) {
      return registerRequest(payload);
    },
    async logout() {
      await logoutRequest();
      clearSession();
      setUser(null);
      setRole(null);
    }
  }), [user, role, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}