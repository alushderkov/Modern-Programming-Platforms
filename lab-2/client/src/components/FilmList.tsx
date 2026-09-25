import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Film } from '../types';
import { STATUS_LABELS } from '../types';
import { PosterImage } from './PosterImage';

interface Props {
  films: Film[];
  selectedId?: string;
}

export function FilmList({ films, selectedId }: Props): ReactNode {
  if (films.length === 0) {
    return (
      <div className="empty">
        <h2>Пока пусто</h2>
        <p>Добавьте фильм — страница не перезагрузится.</p>
      </div>
    );
  }

  return (
    <ul className="grid">
      {films.map((film) => (
        <li key={film.id}>
          <Link className={`card ${selectedId === film.id ? 'is-active' : ''}`} to={`/${film.id}`}>
            <div className="poster">
              <PosterImage filmId={film.id} updatedAt={film.updatedAt} hasPoster={film.hasPoster} />
            </div>
            <div className="card-body">
              <h2>{film.title}</h2>
              <p className="muted">
                {film.director}
                {film.year ? ` · ${film.year}` : ''}
              </p>
              <span className={`badge badge-${film.status}`}>{STATUS_LABELS[film.status]}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
