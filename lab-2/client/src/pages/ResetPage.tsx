import type { FormEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api';
import { ErrorBanner } from '../components/ErrorBanner';

export function ResetPage(): ReactNode {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, password);
      navigate('/login');
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="panel auth-card">
        <h1>Новый пароль</h1>
        <p className="muted">Ссылка из письма одноразовая и живёт 1 час (HTTP 410, если истекла).</p>
        <ErrorBanner error={error} />
        {!token ? <p className="muted">В ссылке нет токена. Запросите восстановление заново.</p> : null}
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Новый пароль (от 8 символов)
            <input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit" disabled={submitting || !token}>
            {submitting ? 'Сохранение…' : 'Сменить пароль'}
          </button>
        </form>
        <Link to="/login">Ко входу</Link>
      </div>
    </div>
  );
}
