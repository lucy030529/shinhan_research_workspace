import { useState, useMemo, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { useCalendar } from '../../store/calendar'
import { NAV_ITEMS } from './nav'

const SEARCH_MAP: { label: string; to: string; keywords: string[] }[] = [
  { label: '대시보드', to: '/', keywords: ['대시보드', '홈', '메인', 'dashboard'] },
  { label: '커버리지 관리', to: '/coverage', keywords: ['커버리지', '종목', 'coverage'] },
  { label: '괴리율 모니터링', to: '/gap-ratio', keywords: ['괴리율', '목표주가', 'gap'] },
  { label: '보고서 작성', to: '/reports', keywords: ['보고서', '리포트', 'report'] },
  { label: '자료실 · 수집', to: '/archive', keywords: ['자료실', '수집', '뉴스', '공시', 'dart', 'archive'] },
  { label: 'IR 자료 수집', to: '/ir', keywords: ['ir', '실적', '자료'] },
  { label: '일정 관리', to: '/calendar', keywords: ['일정', '캘린더', 'calendar'] },
  { label: '오타 검수', to: '/typo', keywords: ['오타', '검수', 'typo'] },
  { label: '내 계정', to: '/account', keywords: ['계정', '프로필', 'account'] },
]

function getVisitCount(): number {
  const key = 'shinhan-visit-count'
  const count = parseInt(localStorage.getItem(key) || '0', 10) + 1
  localStorage.setItem(key, String(count))
  return count
}

export default function AppLayout() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const calendarEvents = useCalendar((s) => s.events)
  const calendarLoaded = useCalendar((s) => s.loaded)
  const fetchCalendarEvents = useCalendar((s) => s.fetchEvents)

  useEffect(() => { if (!calendarLoaded) fetchCalendarEvents() }, [calendarLoaded, fetchCalendarEvents])
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [visitCount] = useState(() => getVisitCount())

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayScheduleCount = calendarEvents.filter((e) => e.date === todayStr).length

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return SEARCH_MAP.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q)),
    )
  }, [searchQuery])

  function handleSearchSelect(to: string) {
    setSearchQuery('')
    navigate(to)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-neutral-100">
      {/* Strapi-style 다크 사이드바 */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[230px] flex-col bg-neutral-900">
        {/* 로고 */}
        <button
          onClick={() => navigate('/')}
          className="flex h-16 items-center gap-2.5 border-b border-neutral-800 px-5 transition-colors hover:bg-neutral-800"
        >
          <img src="/shinhan-logo.png" alt="신한투자증권" className="h-7 brightness-0 invert" />
          <span className="text-xs font-medium text-neutral-400">리서치본부</span>
        </button>

        {/* 사이트 이용 통계 + 검색 */}
        <div className="border-b border-neutral-800 px-3 py-3">
          <div className="mb-2.5 flex items-center gap-3 px-1">
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              방문 {visitCount}회
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              금일 일정 {todayScheduleCount}건
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="업무 검색..."
              className="w-full rounded bg-neutral-800 border border-neutral-700 px-3 py-1.5 pl-8 text-xs text-neutral-300 placeholder-neutral-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-600">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-neutral-200 bg-white py-1 shadow-pop">
                {searchResults.map((r) => (
                  <button
                    key={r.to}
                    onClick={() => handleSearchSelect(r.to)}
                    className="block w-full px-3 py-2 text-left text-xs text-ink hover:bg-neutral-100"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 컴플라이언스 푸터 */}
        <div className="border-t border-neutral-800 px-4 py-3">
          <p className="text-[10px] font-medium text-neutral-500">리서치본부 워크스페이스</p>
          <p className="mt-1 text-[9px] leading-relaxed text-neutral-600">
            서울 영등포구 의사당대로 96 TP타워<br />
            본 사이트는 신한투자증권 리서치본부 내부 업무용으로 제공됩니다.<br />
            &copy; 2026 Shinhan Securities.
          </p>
        </div>
      </aside>

      {/* 본문 */}
      <div className="flex flex-1 flex-col pl-[230px]">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-6">
          <div className="text-sm text-neutral-600">
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/account')}
              className="flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-neutral-100"
              title="내 계정"
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-ink">{user?.name}</p>
                <p className="text-[11px] text-neutral-500">
                  {user?.title || (user?.role === 'admin' ? '관리자' : '직급 미설정')}{user?.department ? ` · ${user.department}` : ''} · {user?.email}
                </p>
              </div>
              {user?.avatar?.startsWith('data:') ? (
                <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-neutral-200" />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: user?.avatar?.startsWith('#') ? user.avatar : '#0046ff' }}
                >
                  {user?.name?.[0] ?? '?'}
                </div>
              )}
            </button>
            <div className="h-5 w-px bg-neutral-200" />
            <button
              onClick={handleLogout}
              className="rounded px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
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
