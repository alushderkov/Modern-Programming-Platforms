export const FILM_STATUSES = ['planned', 'watching', 'watched'] as const;

export type FilmStatus = (typeof FILM_STATUSES)[number];

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

export const STATUS_LABELS: Record<FilmStatus, string> = {
  planned: 'В планах',
  watching: 'Смотрю',
  watched: 'Просмотрен',
};
