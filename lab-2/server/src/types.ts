export const FILM_STATUSES = ['planned', 'watching', 'watched'] as const;

export type FilmStatus = (typeof FILM_STATUSES)[number];

export const ROLES = ['viewer', 'editor', 'admin'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LEVEL: Record<Role, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export interface PosterMeta {
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface FilmDto {
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

export interface UserDto {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface SessionDto {
  id: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: UserDto;
}

export interface ErrorBody {
  status: number;
  error: string;
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
  requestId?: string;
}

export function hasMinRole(role: Role, minimum: Role): boolean {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimum];
}
