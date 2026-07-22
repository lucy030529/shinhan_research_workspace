import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import { RequireAuth } from './routes/guards'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CoveragePage from './pages/CoveragePage'
import GapRatioPage from './pages/GapRatioPage'
import ErrorBoundary from './components/ErrorBoundary'
import ArchivePage from './pages/ArchivePage'
import CalendarPage from './pages/CalendarPage'
import AnalystPage from './pages/AnalystPage'
import RegisterPage from './pages/RegisterPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AccountPage from './pages/AccountPage'
// import IRCollectionPage from './pages/IRCollectionPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/coverage" element={<CoveragePage />} />
        <Route path="/gap-ratio" element={<ErrorBoundary><GapRatioPage /></ErrorBoundary>} />
        <Route path="/analyst" element={<AnalystPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>
    </Routes>
  )
}
