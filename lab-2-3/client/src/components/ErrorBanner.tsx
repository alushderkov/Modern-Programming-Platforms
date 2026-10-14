import type { ReactNode } from 'react';
import { ApiError } from '../api';

interface Props {
  error: unknown;
}

export function ErrorBanner({ error }: Props): ReactNode {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    return (
      <div className="banner banner-err" role="alert">
        <strong>{error.message}</strong>
        <span className="muted">
          {' '}
          · HTTP {error.status}
          {error.code ? ` · ${error.code}` : ''}
        </span>
        {error.details.length > 0 ? (
          <ul>
            {error.details.map((item) => (
              <li key={`${item.field}-${item.message}`}>
                {item.field}: {item.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
  return (
    <div className="banner banner-err" role="alert">
      {message}
    </div>
  );
}
