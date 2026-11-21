export const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const TOKEN_KEY = 'ved_token';
const USER_KEY = 'ved_user';

export type User = { id: string; email: string; role: string };

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function getStoredUser(): User | null {
  const raw = storage()?.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: User) {
  storage()?.setItem(TOKEN_KEY, token);
  storage()?.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  storage()?.removeItem(TOKEN_KEY);
  storage()?.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Fetch a backend path with the session token attached. Throws ApiError on non-2xx. */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Cannot reach the backend. Check that it is running.', 0);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const body = data as { error?: unknown } | null;
    const message =
      body && typeof body === 'object' && typeof body.error === 'string' ? body.error : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

/** The live-events socket. Browsers cannot set headers on a WebSocket, so the token goes in the query. */
export function liveSocketUrl(): string {
  return `${BACKEND_URL.replace(/^http/, 'ws')}/live?token=${encodeURIComponent(getToken() || '')}`;
}
