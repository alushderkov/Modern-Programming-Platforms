import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { listUsers, patchUserRole } from '../api';
import { ErrorBanner } from '../components/ErrorBanner';
import type { Role, User } from '../types';
import { ROLE_LABELS, ROLES } from '../types';

export function AdminPage(): ReactNode {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listUsers().then(setUsers).catch(setError);
  }, []);

  async function handleRole(id: string, role: Role): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const updated = await patchUserRole(id, role);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ErrorBanner error={error} />
      <h1>Пользователи</h1>
      <p className="muted">Смена роли доступна только администратору. Новые регистрации получают роль зрителя.</p>
      <table className="users-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Роль</th>
            <th>Создан</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>
                <select
                  value={user.role}
                  disabled={busy}
                  onChange={(event) => void handleRole(user.id, event.target.value as Role)}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="muted">{new Date(user.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
