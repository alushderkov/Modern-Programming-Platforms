import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { Film, FilmPayload, FilmStatus } from '../types';
import { STATUS_LABELS } from '../types';

interface Props {
  film?: Film | null;
  submitting: boolean;
  readOnly?: boolean;
  onSubmit: (payload: FilmPayload, poster: File | null) => Promise<void>;
  onDeletePoster?: () => Promise<void>;
}

const empty: FilmPayload = {
  title: '',
  director: '',
  year: null,
  status: 'planned',
  rating: null,
  notes: '',
};

export function FilmForm({ film, submitting, readOnly, onSubmit, onDeletePoster }: Props): ReactNode {
  const [values, setValues] = useState<FilmPayload>(empty);
  const [poster, setPoster] = useState<File | null>(null);

  useEffect(() => {
    setPoster(null);
    if (film) {
      setValues({
        title: film.title,
        director: film.director,
        year: film.year,
        status: film.status,
        rating: film.rating,
        notes: film.notes,
      });
      return;
    }
    setValues(empty);
  }, [film]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (readOnly) {
      return;
    }
    await onSubmit(values, poster);
    if (!film) {
      setValues(empty);
      setPoster(null);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        Название
        <input
          required
          maxLength={120}
          disabled={readOnly}
          value={values.title}
          onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
        />
      </label>
      <label>
        Режиссёр
        <input
          required
          maxLength={120}
          disabled={readOnly}
          value={values.director}
          onChange={(event) => setValues((prev) => ({ ...prev, director: event.target.value }))}
        />
      </label>
      <div className="form-row">
        <label>
          Год
          <input
            type="number"
            min={1888}
            max={2100}
            disabled={readOnly}
            value={values.year ?? ''}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                year: event.target.value === '' ? null : Number(event.target.value),
              }))
            }
          />
        </label>
        <label>
          Оценка (1–10)
          <input
            type="number"
            min={1}
            max={10}
            disabled={readOnly}
            value={values.rating ?? ''}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                rating: event.target.value === '' ? null : Number(event.target.value),
              }))
            }
          />
        </label>
      </div>
      <label>
        Статус
        <select
          disabled={readOnly}
          value={values.status}
          onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value as FilmStatus }))}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Заметки
        <textarea
          rows={4}
          maxLength={2000}
          disabled={readOnly}
          value={values.notes}
          onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
        />
      </label>
      {readOnly ? null : (
        <label>
          Постер (JPEG, PNG, WebP, GIF · до 5 МБ)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => setPoster(event.target.files?.[0] ?? null)}
          />
        </label>
      )}
      {film?.hasPoster && onDeletePoster && !readOnly ? (
        <button type="button" className="btn btn-ghost" onClick={() => void onDeletePoster()}>
          Удалить текущий постер
        </button>
      ) : null}
      {readOnly ? null : (
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Сохранение…' : film ? 'Сохранить' : 'Добавить фильм'}
        </button>
      )}
    </form>
  );
}
