import type { FilmDocument } from './models/Film';
import type { FilmDto } from './types';

export function toFilmDto(doc: FilmDocument): FilmDto {
  const id = doc._id.toString();
  const hasPoster = Boolean(doc.poster?.storedName);
  return {
    id,
    title: doc.title,
    director: doc.director,
    year: doc.year ?? null,
    status: doc.status,
    rating: doc.rating ?? null,
    notes: doc.notes ?? '',
    hasPoster,
    posterUrl: hasPoster ? `/api/films/${id}/poster` : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
