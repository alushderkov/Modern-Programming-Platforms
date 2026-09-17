import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { FilmForm } from '../components/FilmForm';
import { FilmList } from '../components/FilmList';
import {
  createFilm,
  deleteFilm,
  deletePoster,
  getFilm,
  listFilms,
  updateFilm,
  uploadPoster,
} from '../api';
import type { Film, FilmPayload, FilmStatus } from '../types';
import { STATUS_LABELS } from '../types';

export function HomePage(): ReactNode {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isCreate = location.pathname === '/new';

  const [status, setStatus] = useState<FilmStatus | 'all'>('all');
  const [films, setFilms] = useState<Film[]>([]);
  const [selected, setSelected] = useState<Film | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const refreshList = useCallback(async () => {
    const items = await listFilms(status);
    setFilms(items);
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void refreshList()
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshList]);

  useEffect(() => {
    if (!id || isCreate) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    setError(null);
    void getFilm(id)
      .then((film) => {
        if (!cancelled) {
          setSelected(film);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSelected(null);
          setError(err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, isCreate]);

  async function handleSubmit(payload: FilmPayload, poster: File | null): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      let film: Film;
      if (isCreate || !id) {
        film = await createFilm(payload);
      } else {
        film = await updateFilm(id, payload);
      }
      if (poster) {
        film = await uploadPoster(film.id, poster);
      }
      await refreshList();
      navigate(`/${film.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!selected) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await deleteFilm(selected.id);
      await refreshList();
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePoster(): Promise<void> {
    if (!selected) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const film = await deletePoster(selected.id);
      setSelected(film);
      await refreshList();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ErrorBanner error={error} />
      <div className="layout">
        <section>
          <div className="section-head">
            <h1>Каталог</h1>
            <Link className="btn btn-primary" to="/new">
              Новый фильм
            </Link>
          </div>
          <nav className="filters" aria-label="Фильтр">
            <button className={status === 'all' ? 'chip is-active' : 'chip'} type="button" onClick={() => setStatus('all')}>
              Все
            </button>
            {(Object.keys(STATUS_LABELS) as FilmStatus[]).map((value) => (
              <button
                key={value}
                type="button"
                className={status === value ? 'chip is-active' : 'chip'}
                onClick={() => setStatus(value)}
              >
                {STATUS_LABELS[value]}
              </button>
            ))}
          </nav>
          {loading ? <p className="muted">Загрузка…</p> : <FilmList films={films} selectedId={selected?.id} />}
        </section>

        <aside className="panel">
          {isCreate ? (
            <>
              <h2>Новый фильм</h2>
              <p className="muted">POST /api/films, затем при файле POST …/poster. Страница не перезагружается.</p>
              <FilmForm submitting={submitting} onSubmit={handleSubmit} />
            </>
          ) : selected ? (
            <>
              <h2>{selected.title}</h2>
              <p className="muted">PUT обновляет карточку, DELETE удаляет запись.</p>
              <FilmForm
                film={selected}
                submitting={submitting}
                onSubmit={handleSubmit}
                onDeletePoster={handleDeletePoster}
              />
              <button className="btn btn-danger" type="button" disabled={submitting} onClick={() => void handleDelete()}>
                Удалить фильм
              </button>
            </>
          ) : (
            <div className="empty compact">
              <h2>Карточка</h2>
              <p>Выберите фильм слева или создайте новый.</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
