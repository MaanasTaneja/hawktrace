export const BACKEND = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8001';

export function getWsBackend(): string {
  const configured = import.meta.env.VITE_BACKEND_WS_URL;
  if (configured) return configured;
  if (BACKEND.startsWith('http')) return BACKEND.replace(/^http/, 'ws');
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

const TOKEN_KEY = 'hawktrace_token';
const USER_KEY = 'hawktrace_user';

export interface StoredUser {
  id: number;
  username: string;
  company: string;
  email: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers }).then(res => {
    if (res.status === 401) {
      clearAuth();
      window.location.reload();
    }
    return res;
  });
}
