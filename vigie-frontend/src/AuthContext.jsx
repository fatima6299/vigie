import { createContext, useContext, useState, useCallback } from 'react';
import { api, setToken, clearToken, getToken } from './api';

const AuthContext = createContext(null);
const SESSION_KEY = 'vigie_session';

function loadSession() {
  const token = getToken();
  const raw = localStorage.getItem(SESSION_KEY);
  if (!token || !raw) return { user: null, tenant: null };
  try { return JSON.parse(raw); } catch { return { user: null, tenant: null }; }
}

export function AuthProvider({ children }) {
  const initial = loadSession();
  const [user, setUser] = useState(initial.user);
  const [tenant, setTenant] = useState(initial.tenant);

  const applySession = useCallback((data) => {
    setToken(data.token);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: data.user, tenant: data.tenant }));
    setUser(data.user);
    setTenant(data.tenant);
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await api.signup(payload);
    applySession(data);
  }, [applySession]);

  const login = useCallback(async (payload) => {
    const data = await api.login(payload);
    applySession(data);
  }, [applySession]);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setTenant(null);
  }, []);

  const isAuthenticated = !!getToken() && !!user;

  return (
    <AuthContext.Provider value={{ user, tenant, isAuthenticated, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
