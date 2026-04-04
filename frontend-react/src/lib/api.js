const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const tokenKey = 'accessToken';
const roleKey = 'userRole';
const userKey = 'userProfile';

export function getToken() {
  return localStorage.getItem(tokenKey);
}

export function setSession(session) {
  if (session?.accessToken) localStorage.setItem(tokenKey, session.accessToken);
  if (session?.user?.role) localStorage.setItem(roleKey, session.user.role);
  if (session?.user) localStorage.setItem(userKey, JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(roleKey);
  localStorage.removeItem(userKey);
}

export function getUserRole() {
  return localStorage.getItem(roleKey);
}

export function getUser() {
  const raw = localStorage.getItem(userKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearSession();
    globalThis.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
}

export async function login(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }

  setSession({ accessToken: data.accessToken, user: data.user });
  return data;
}

export async function register(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Registration failed');
  }

  return data;
}

export async function logout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    clearSession();
  }
}