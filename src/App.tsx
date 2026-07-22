import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import { RequireAuth, RequireGate } from './routes/guards'
import GatePage from './pages/GatePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CoveragePage from './pages/CoveragePage'
import GapRatioPage from './pages/GapRatioPage'
import ErrorBoundary from './components/ErrorBoundary'
import ReportsPage from './pages/ReportsPage'
import ArchivePage from './pages/ArchivePage'
import CalendarPage from './pages/CalendarPage'
import TypoCheckPage from './pages/TypoCheckPage'
import RegisterPage from './pages/RegisterPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AccountPage from './pages/AccountPage'
// import IRCollectionPage from './pages/IRCollectionPage'

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
        path="/register"
        element={
          <RequireGate>
            <RegisterPage />
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
        <Route path="/gap-ratio" element={<ErrorBoundary><GapRatioPage /></ErrorBoundary>} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/typo" element={<TypoCheckPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>
    </Routes>
  )
}
