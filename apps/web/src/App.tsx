import { Link, Route, Routes } from 'react-router-dom';
import { CatalogPage } from './pages/CatalogPage';
import { ReviewPage } from './pages/ReviewPage';
import { RunPage } from './pages/RunPage';
import { getStudentId } from './student';

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand">
          生物仿真实验平台
        </Link>
        <span className="app-student" title="本地学生标识">
          {getStudentId()}
        </span>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/runs/:runId" element={<RunPage />} />
          <Route path="/runs/:runId/review" element={<ReviewPage />} />
        </Routes>
      </main>
    </div>
  );
}
