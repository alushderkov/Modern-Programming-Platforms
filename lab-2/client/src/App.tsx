import type { ReactNode } from 'react';
import { Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPage } from './pages/ForgotPage';
import { ResetPage } from './pages/ResetPage';
import { SessionsPage } from './pages/SessionsPage';
import { AdminPage } from './pages/AdminPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './auth';
import { ROLE_LABELS, hasMinRole } from './types';

function Shell({ children }: { children: ReactNode }): ReactNode {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await logout();
    navigate('/login');
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="mark">К</span>
          <div>
            <strong>Кадр</strong>
            <small>Лабораторная №3 · роли, ключи, защита</small>
          </div>
        </Link>
        {user ? (
          <div className="topbar-actions">
            <span className="role-pill">{ROLE_LABELS[user.role]}</span>
            <span className="muted hide-narrow">{user.email}</span>
            <Link className="btn btn-ghost" to="/sessions">
              Сессии
            </Link>
            {hasMinRole(user.role, 'admin') ? (
              <Link className="btn btn-ghost" to="/admin">
                Пользователи
              </Link>
            ) : null}
            <button className="btn" type="button" onClick={() => void handleLogout()}>
              Выйти
            </button>
          </div>
        ) : null}
      </header>
      {children}
    </div>
  );
}

export function App(): ReactNode {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Shell>{!loading && user ? <Navigate to="/" replace /> : <LoginPage />}</Shell>
        }
      />
      <Route path="/forgot" element={<Shell><ForgotPage /></Shell>} />
      <Route path="/reset" element={<Shell><ResetPage /></Shell>} />
      <Route
        path="/sessions"
        element={
          <Shell>
            <ProtectedRoute>
              <SessionsPage />
            </ProtectedRoute>
          </Shell>
        }
      />
      <Route
        path="/admin"
        element={
          <Shell>
            <ProtectedRoute minRole="admin">
              <AdminPage />
            </ProtectedRoute>
          </Shell>
        }
      />
      <Route
        path="/new"
        element={
          <Shell>
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          </Shell>
        }
      />
      <Route
        path="/:id"
        element={
          <Shell>
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          </Shell>
        }
      />
      <Route
        path="/"
        element={
          <Shell>
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          </Shell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
