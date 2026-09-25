import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../auth';

export function LoginPage(): ReactNode {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@kadr.local');
  const [password, setPassword] = useState('admin123');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="panel auth-card">
        <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
        <p className="muted">
          Доступ по временному ключу (JWT, 15 мин) и ключу обновления сессии. Роли: зритель, редактор, админ.
        </p>
        <ErrorBanner error={error} />
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Пароль
            <input type="password" required minLength={mode === 'register' ? 8 : 1} value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Секунду…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>
        <p className="muted demo-creds">
          Демо: <code>admin@kadr.local / admin123</code> · <code>editor@kadr.local / editor123</code> ·{' '}
          <code>viewer@kadr.local / viewer123</code>
        </p>
        <div className="auth-links">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMode((prev) => (prev === 'login' ? 'register' : 'login'))}
          >
            {mode === 'login' ? 'Нет аккаунта — регистрация' : 'Уже есть аккаунт — вход'}
          </button>
          <Link to="/forgot">Забыли пароль?</Link>
        </div>
      </div>
    </div>
  );
}
