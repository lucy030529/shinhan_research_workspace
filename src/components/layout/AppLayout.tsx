import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { NAV_ITEMS } from './nav'

export default function AppLayout() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 사이드바 */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center border-b border-slate-100 px-5">
          <img src="/logo.svg" alt="신한투자증권 리서치" className="h-7" />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-soft hover:bg-slate-50 hover:text-ink'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <p className="px-3 text-[11px] text-ink-faint">기업분석2부 리서치 워크스페이스</p>
        </div>
      </aside>

      {/* 본문 */}
      <div className="flex flex-1 flex-col pl-60">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur">
          <div className="text-sm text-ink-faint">
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-ink">{user?.name}</p>
              <p className="text-[11px] text-ink-faint">
                {user?.role === 'admin' ? '관리자' : '애널리스트'} · {user?.email}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {user?.name?.[0] ?? '?'}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-sm text-ink-soft hover:bg-slate-100"
            >
              로그아웃
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
