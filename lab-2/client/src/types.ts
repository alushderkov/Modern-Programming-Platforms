export const FILM_STATUSES = ['planned', 'watching', 'watched'] as const;

export type FilmStatus = (typeof FILM_STATUSES)[number];

export const ROLES = ['viewer', 'editor', 'admin'] as const;

export type Role = (typeof ROLES)[number];

export interface Film {
  id: string;
  title: string;
  director: string;
  year: number | null;
  status: FilmStatus;
  rating: number | null;
  notes: string;
  hasPoster: boolean;
  posterUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FilmPayload {
  title: string;
  director: string;
  year: number | null;
  status: FilmStatus;
  rating: number | null;
  notes: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: User;
}

export interface SessionInfo {
  id: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

export const STATUS_LABELS: Record<FilmStatus, string> = {
  planned: 'В планах',
  watching: 'Смотрю',
  watched: 'Просмотрен',
};

export const ROLE_LABELS: Record<Role, string> = {
  viewer: 'Зритель',
  editor: 'Редактор',
  admin: 'Админ',
};

const ROLE_LEVEL: Record<Role, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export function hasMinRole(role: Role | undefined, minimum: Role): boolean {
  if (!role) {
    return false;
  }
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimum];
}
