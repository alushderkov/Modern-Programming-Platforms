export const FILM_STATUSES = ['planned', 'watching', 'watched'] as const;

export type FilmStatus = (typeof FILM_STATUSES)[number];

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

export interface ErrorBody {
  error: string;
  details?: Array<{ field: string; message: string }>;
}
