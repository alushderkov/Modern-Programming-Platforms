import type { FieldError, Film, FilmPayload, FilmStatus } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    details?: FieldError[];
  } & T;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload.error || `Ошибка запроса (${response.status})`,
      payload.details ?? [],
    );
  }

  return payload as T;
}

export function listFilms(status?: FilmStatus | 'all'): Promise<Film[]> {
  const query = status && status !== 'all' ? `?status=${status}` : '';
  return fetch(`/api/films${query}`).then((res) => parseResponse<Film[]>(res));
}

export function getFilm(id: string): Promise<Film> {
  return fetch(`/api/films/${id}`).then((res) => parseResponse<Film>(res));
}

export function createFilm(body: FilmPayload): Promise<Film> {
  return fetch('/api/films', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((res) => parseResponse<Film>(res));
}

export function updateFilm(id: string, body: FilmPayload): Promise<Film> {
  return fetch(`/api/films/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((res) => parseResponse<Film>(res));
}

export function deleteFilm(id: string): Promise<void> {
  return fetch(`/api/films/${id}`, { method: 'DELETE' }).then((res) => parseResponse<{ ok: boolean }>(res)).then(() => undefined);
}

export function uploadPoster(id: string, file: File): Promise<Film> {
  const data = new FormData();
  data.append('poster', file);
  return fetch(`/api/films/${id}/poster`, {
    method: 'POST',
    body: data,
  }).then((res) => parseResponse<Film>(res));
}

export function deletePoster(id: string): Promise<Film> {
  return fetch(`/api/films/${id}/poster`, { method: 'DELETE' }).then((res) => parseResponse<Film>(res));
}

export function posterSrc(film: Film): string | null {
  if (!film.posterUrl) {
    return null;
  }
  return `${film.posterUrl}?t=${encodeURIComponent(film.updatedAt)}`;
}
