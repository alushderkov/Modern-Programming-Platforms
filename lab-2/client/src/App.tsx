import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';

export function App(): ReactNode {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="mark">К</span>
          <div>
            <strong>Кадр</strong>
            <small>Лабораторная №2 · SPA + REST</small>
          </div>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new" element={<HomePage />} />
        <Route path="/:id" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
