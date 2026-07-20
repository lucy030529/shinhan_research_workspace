import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import { RequireAuth, RequireGate } from './routes/guards'
import GatePage from './pages/GatePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CoveragePage from './pages/CoveragePage'
import GapRatioPage from './pages/GapRatioPage'
import DailyAgentPage from './pages/DailyAgentPage'
import ReportsPage from './pages/ReportsPage'
import ArchivePage from './pages/ArchivePage'
import WorklogPage from './pages/WorklogPage'
import TypoCheckPage from './pages/TypoCheckPage'

export default function App() {
  return (
    <Routes>
      <Route path="/gate" element={<GatePage />} />
      <Route
        path="/login"
        element={
          <RequireGate>
            <LoginPage />
          </RequireGate>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/coverage" element={<CoveragePage />} />
        <Route path="/gap-ratio" element={<GapRatioPage />} />
        <Route path="/daily" element={<DailyAgentPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/worklog" element={<WorklogPage />} />
        <Route path="/typo" element={<TypoCheckPage />} />
      </Route>
    </Routes>
  )
}
