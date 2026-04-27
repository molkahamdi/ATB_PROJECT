
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore }      from './services/authStore';
import { LoginPage }         from './pages/LoginPage';
import { DashboardPage }     from './pages/DashboardPage';
import { DossiersPage }      from './pages/DossiersPage';
import { DossierDetailPage } from './pages/DossierDetailPage';
import { AuditLogPage } from './pages/AuditLogPage';

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ok = useAuthStore(s => s.isLogged);
  return ok ? <>{children}</> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <Routes>
        <Route path="/login"        element={<LoginPage />} />
        <Route path="/dashboard"    element={<Protected><DashboardPage /></Protected>} />
        <Route path="/dossiers"     element={<Protected><DossiersPage /></Protected>} />
        <Route path="/dossiers/:id" element={<Protected><DossierDetailPage /></Protected>} />
        <Route path="/audit"     element={<Protected>{<AuditLogPage />}</Protected>} />
      </Routes>
    </BrowserRouter>
  );
}