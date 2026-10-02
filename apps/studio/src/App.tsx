import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/auth';
import { EditorPage } from './pages/EditorPage';
import { ExperimentListPage } from './pages/ExperimentListPage';
import { LoginPage } from './pages/LoginPage';
import { RunsPage } from './pages/RunsPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LoginGate() {
  const { authenticated } = useAuth();
  if (authenticated) return <Navigate to="/" replace />;
  return <LoginPage />;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginGate />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <ExperimentListPage />
            </RequireAuth>
          }
        />
        <Route
          path="/experiments/:id/edit"
          element={
            <RequireAuth>
              <EditorPage />
            </RequireAuth>
          }
        />
        <Route
          path="/experiments/:id/runs"
          element={
            <RequireAuth>
              <RunsPage />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
