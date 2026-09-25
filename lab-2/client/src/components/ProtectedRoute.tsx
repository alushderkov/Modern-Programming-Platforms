import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import type { Role } from '../types';
import { hasMinRole } from '../types';

interface Props {
  children: ReactNode;
  minRole?: Role;
}

export function ProtectedRoute({ children, minRole = 'viewer' }: Props): ReactNode {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="muted">Проверка ключа доступа…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasMinRole(user.role, minRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
