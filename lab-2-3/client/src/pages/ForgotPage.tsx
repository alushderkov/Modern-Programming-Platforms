import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api';
import { ErrorBanner } from '../components/ErrorBanner';

export function ForgotPage(): ReactNode {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState('');

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await forgotPassword(email);
      setDone(result.message);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="panel auth-card">
        <h1>Восстановление доступа</h1>
        <p className="muted">
          Пришлём одноразовую ссылку на почту. Если SMTP не настроен, ссылка появится в JSON-логах API
          (<code>mail.dev_dump</code>).
        </p>
        <ErrorBanner error={error} />
        {done ? <div className="banner banner-ok">{done}</div> : null}
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Отправка…' : 'Отправить ссылку'}
          </button>
        </form>
        <Link to="/login">Назад ко входу</Link>
      </div>
    </div>
  );
}
