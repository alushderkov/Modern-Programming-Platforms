import type { FieldError, Film, FilmPayload, FilmStatus, SessionInfo, TokenPair, User } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details: FieldError[] = [],
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const ACCESS_KEY = 'kadr.accessToken';
const REFRESH_KEY = 'kadr.refreshToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function saveTokens(tokens: Pick<TokenPair, 'accessToken' | 'refreshToken'>): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    code?: string;
    details?: FieldError[];
  } & T;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload.message || payload.error || `Ошибка запроса (${response.status})`,
      payload.details ?? [],
      payload.code,
    );
  }

  return payload as T;
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    clearTokens();
    return false;
  }
  const tokens = (await response.json()) as TokenPair;
  saveTokens(tokens);
  return true;
}

function ensureRefreshed(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function authedFetch(input: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && retry && getRefreshToken() && !input.startsWith('/api/auth/refresh')) {
    const ok = await ensureRefreshed();
    if (ok) {
      return authedFetch(input, init, false);
    }
  }
  return response;
}

function jsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

export function login(email: string, password: string): Promise<TokenPair> {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  }).then((res) => parseResponse<TokenPair>(res));
}

export function register(email: string, password: string): Promise<TokenPair> {
  return fetch('/api/auth/register', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  }).then((res) => parseResponse<TokenPair>(res));
}

export function fetchMe(): Promise<User> {
  return authedFetch('/api/auth/me').then((res) => parseResponse<User>(res));
}

export async function logout(): Promise<void> {
  try {
    await authedFetch('/api/auth/logout', { method: 'POST' }, false).then((res) => parseResponse<void>(res));
  } catch {
    // сессия могла быть уже отозвана
  } finally {
    clearTokens();
  }
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email }),
  }).then((res) => parseResponse<{ message: string }>(res));
}

export function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ token, password }),
  }).then((res) => parseResponse<{ message: string }>(res));
}

export function listSessions(): Promise<SessionInfo[]> {
  return authedFetch('/api/auth/sessions').then((res) => parseResponse<SessionInfo[]>(res));
}

export function revokeSession(id: string): Promise<void> {
  return authedFetch(`/api/auth/sessions/${id}`, { method: 'DELETE' }).then((res) => parseResponse<void>(res));
}

export function revokeOtherSessions(): Promise<{ revoked: number }> {
  return authedFetch('/api/auth/sessions', { method: 'DELETE' }).then((res) => parseResponse<{ revoked: number }>(res));
}

export function listUsers(): Promise<User[]> {
  return authedFetch('/api/users').then((res) => parseResponse<User[]>(res));
}

export function patchUserRole(id: string, role: User['role']): Promise<User> {
  return authedFetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ role }),
  }).then((res) => parseResponse<User>(res));
}

export function listFilms(status?: FilmStatus | 'all'): Promise<Film[]> {
  const query = status && status !== 'all' ? `?status=${status}` : '';
  return authedFetch(`/api/films${query}`).then((res) => parseResponse<Film[]>(res));
}

export function getFilm(id: string): Promise<Film> {
  return authedFetch(`/api/films/${id}`).then((res) => parseResponse<Film>(res));
}

export function createFilm(body: FilmPayload): Promise<Film> {
  return authedFetch('/api/films', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  }).then((res) => parseResponse<Film>(res));
}

export function updateFilm(id: string, body: FilmPayload): Promise<Film> {
  return authedFetch(`/api/films/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  }).then((res) => parseResponse<Film>(res));
}

export function deleteFilm(id: string): Promise<void> {
  return authedFetch(`/api/films/${id}`, { method: 'DELETE' }).then((res) => parseResponse<void>(res));
}

export function uploadPoster(id: string, file: File): Promise<Film> {
  const data = new FormData();
  data.append('poster', file);
  return authedFetch(`/api/films/${id}/poster`, {
    method: 'POST',
    body: data,
  }).then((res) => parseResponse<Film>(res));
}

export function deletePoster(id: string): Promise<Film> {
  return authedFetch(`/api/films/${id}/poster`, { method: 'DELETE' }).then((res) => parseResponse<Film>(res));
}

export async function fetchPosterObjectUrl(id: string): Promise<string | null> {
  const response = await authedFetch(`/api/films/${id}/poster`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    await parseResponse(response);
    return null;
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function tryRestoreSession(): Promise<User | null> {
  if (!getAccessToken() && !getRefreshToken()) {
    return null;
  }
  try {
    return await fetchMe();
  } catch {
    const ok = await ensureRefreshed();
    if (!ok) {
      clearTokens();
      return null;
    }
    try {
      return await fetchMe();
    } catch {
      clearTokens();
      return null;
    }
  }
}
