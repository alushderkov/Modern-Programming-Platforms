import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSessions, revokeOtherSessions, revokeSession } from '../api';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../auth';
import type { SessionInfo } from '../types';

export function SessionsPage(): ReactNode {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function refresh(): Promise<void> {
    const items = await listSessions();
    setSessions(items);
  }

  useEffect(() => {
    void refresh().catch(setError);
  }, []);

  async function handleRevoke(id: string): Promise<void> {
    const isCurrent = sessions.some((session) => session.id === id && session.current);
    setBusy(true);
    setError(null);
    try {
      await revokeSession(id);
      if (isCurrent) {
        await logout();
        navigate('/login');
        return;
      }
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeOthers(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await revokeOtherSessions();
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ErrorBanner error={error} />
      <div className="section-head">
        <h1>Активные подключения</h1>
        <button className="btn" type="button" disabled={busy} onClick={() => void handleRevokeOthers()}>
          Завершить остальные
        </button>
      </div>
      <p className="muted">Не больше пяти живых сессий: новая вытесняет самую старую. Отзыв сразу гасит ключ доступа.</p>
      <ul className="session-list">
        {sessions.map((session) => (
          <li key={session.id} className="panel session-item">
            <div>
              <strong>{session.current ? 'Это устройство' : session.ip || 'сессия'}</strong>
              <p className="muted">
                {session.userAgent || 'без User-Agent'}
                <br />
                вход {new Date(session.createdAt).toLocaleString()} · активность {new Date(session.lastSeenAt).toLocaleString()}
              </p>
            </div>
            <button className="btn btn-danger" type="button" disabled={busy} onClick={() => void handleRevoke(session.id)}>
              Отозвать
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
