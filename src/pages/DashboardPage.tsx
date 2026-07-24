import { useEffect, useMemo, useState } from 'react'
import { Badge, Card, CardHeader, PageHeader, StatTile } from '../components/ui'
import { useCoverage } from '../store/coverage'
import { useGapRatio } from '../store/gapRatio'
import { useCalendar } from '../store/calendar'
import { daysUntil, dueTone, formatPct, gapTone } from '../lib/utils'
import { useAuth } from '../store/auth'
import { fetchShinhanResearch, fetchStockPrices } from '../lib/api'

export default function DashboardPage() {
  const user = useAuth((s) => s.user)
  const coverageItems = useCoverage((s) => s.items)
  const loadAnalystCoverage = useCoverage((s) => s.loadAnalystCoverage)
  const syncFromReports = useCoverage((s) => s.syncFromReports)
  const gapItems = useGapRatio((s) => s.items)
  const loadAnalystTargetPrices = useGapRatio((s) => s.loadAnalystTargetPrices)
  const syncTargetPrices = useGapRatio((s) => s.syncTargetPrices)
  const refreshPrices = useGapRatio((s) => s.refreshPrices)
  const calendarEvents = useCalendar((s) => s.events)
  const calendarLoaded = useCalendar((s) => s.loaded)
  const fetchCalendarEvents = useCalendar((s) => s.fetchEvents)
  const [syncStatus, setSyncStatus] = useState('')

  useEffect(() => { if (!calendarLoaded) fetchCalendarEvents() }, [calendarLoaded, fetchCalendarEvents])

  // 1) 엑셀 기본 데이터 로드 → 2) 신한 리서치 최신 리포트 동기화 → 3) 현재가 조회
  useEffect(() => {
    async function init() {
      // Step 1: 엑셀 기반 초기 데이터
      setSyncStatus('커버리지 데이터 로드 중...')
      const covCount = loadAnalystCoverage()
      loadAnalystTargetPrices()

      // Step 2: 네이버 증권 신한 리서치 최신 리포트로 갱신
      setSyncStatus(`기본 ${covCount}종목 로드 완료. 신한 리서치 최신 리포트 동기화 중...`)
      let reportSync = ''
      try {
        const { items } = await fetchShinhanResearch({ pageSize: 100 })
        const reports = items.filter((r) => r.ticker)
        if (reports.length > 0) {
          const covUpdated = syncFromReports(reports.map((r) => ({ ticker: r.ticker, name: r.company, date: r.date, analyst: r.analyst })))
          const gapUpdated = syncTargetPrices(reports.map((r) => ({ ticker: r.ticker, name: r.company, targetPrice: r.targetPrice, analyst: r.analyst })))
          reportSync = covUpdated > 0 || gapUpdated > 0
            ? `리서치 ${reports.length}건 → 커버리지 ${covUpdated}건·목표주가 ${gapUpdated}건 갱신. `
            : `리서치 ${reports.length}건 확인 (변동 없음). `
        }
      } catch {
        reportSync = '리서치 동기화 실패. '
      }

      // Step 3: 현재가 조회
      setSyncStatus(`${reportSync}현재가 조회 중...`)
      const tickers = useGapRatio.getState().items.map((g) => g.ticker).filter(Boolean)
      if (tickers.length > 0) {
        try {
          const prices = await fetchStockPrices(tickers)
          refreshPrices(prices.map((p) => ({ ticker: p.ticker, currentPrice: p.currentPrice })))
          setSyncStatus(`동기화 완료: ${useCoverage.getState().items.length}종목, ${reportSync}현재가 ${prices.length}건`)
        } catch {
          setSyncStatus(`${reportSync}현재가 조회 실패`)
        }
      } else {
        setSyncStatus(`${reportSync}${covCount}종목 로드 완료`)
      }
    }
    init()
  }, [loadAnalystCoverage, loadAnalystTargetPrices, syncFromReports, syncTargetPrices, refreshPrices])

  const dueSoon = [...coverageItems]
    .map((c) => ({ ...c, days: daysUntil(c.nextDue) }))
    .filter((c) => c.days <= 30)
    .sort((a, b) => a.days - b.days)

  const warnings = gapItems.filter((g) => Math.abs(g.gapRatio) >= 30)

  // 마감일 1주일 내 일정
  const todayDate = new Date()
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`
  const weekLaterStr = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const upcomingDeadlines = useMemo(() => {
    return calendarEvents
      .filter((ev) => {
        const evDate = ev.endDate || ev.date
        return evDate >= todayStr && ev.date <= weekLaterStr
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [calendarEvents, todayStr, weekLaterStr])

  const dueSoonByAnalyst = useMemo(() => {
    const map = new Map<string, typeof dueSoon>()
    for (const c of dueSoon) {
      const key = c.analyst || '미지정'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [dueSoon])

  const tickerAnalystMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of coverageItems) {
      if (c.ticker) map.set(c.ticker, c.analyst || '미지정')
    }
    return map
  }, [coverageItems])

  const warningsByAnalyst = useMemo(() => {
    const map = new Map<string, typeof warnings>()
    for (const g of warnings) {
      const analyst = tickerAnalystMap.get(g.ticker) || '미지정'
      if (!map.has(analyst)) map.set(analyst, [])
      map.get(analyst)!.push(g)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [warnings, tickerAnalystMap])

  const [openDueAnalysts, setOpenDueAnalysts] = useState<Set<string>>(new Set())
  const [openWarnAnalysts, setOpenWarnAnalysts] = useState<Set<string>>(new Set())

  function toggleDue(analyst: string) {
    setOpenDueAnalysts((prev) => {
      const next = new Set(prev)
      next.has(analyst) ? next.delete(analyst) : next.add(analyst)
      return next
    })
  }
  function toggleWarn(analyst: string) {
    setOpenWarnAnalysts((prev) => {
      const next = new Set(prev)
      next.has(analyst) ? next.delete(analyst) : next.add(analyst)
      return next
    })
  }

  const COLOR_LABEL: Record<string, string> = {
    blue: '리포트', red: '마감', green: '미팅', amber: '공시', purple: '기타', cyan: '교육',
  }
  const COLOR_DOT: Record<string, string> = {
    blue: 'bg-blue-500', red: 'bg-red-500', green: 'bg-emerald-500', amber: 'bg-amber-500', purple: 'bg-purple-500', cyan: 'bg-cyan-500',
  }

  function formatDateRange(ev: typeof calendarEvents[0]) {
    const start = ev.date.slice(5).replace('-', '/')
    if (ev.endDate && ev.endDate !== ev.date) {
      return `${start} ~ ${ev.endDate.slice(5).replace('-', '/')}`
    }
    return start
  }

  function deadlineDaysLeft(ev: typeof calendarEvents[0]) {
    const target = ev.endDate || ev.date
    return daysUntil(target)
  }

  return (
    <div>
      <PageHeader
        title={`안녕하세요, ${user?.name}님`}
        description="오늘의 리서치 업무 현황을 한눈에 확인하세요."
      />

      {syncStatus && (
        <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${
          syncStatus.includes('실패') ? 'border-danger-100 bg-danger-100 text-danger-700'
            : syncStatus.includes('중...') ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          {syncStatus}
        </div>
      )}

      {/* 요약 지표 — 균등 3분할 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="커버리지 종목" value={coverageItems.length} hint="담당 종목 수" tone="brand" />
        <StatTile
          label="30일 내 업데이트 필요"
          value={dueSoon.length}
          hint="30일 내 만기 임박"
          tone={dueSoon.length ? 'amber' : 'slate'}
        />
        <StatTile
          label="괴리율 경고"
          value={warnings.length}
          hint="|괴리율| >= 30%"
          tone={warnings.length ? 'amber' : 'green'}
        />
      </div>

      {/* 마감일 데드라인 (1주일 내) */}
      <div className="mt-6">
        <Card>
          <div className="flex items-center gap-3 border-b border-neutral-150 px-5 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">마감일 데드라인</h3>
              <p className="text-xs text-neutral-500">1주일 내 일정 {upcomingDeadlines.length}건</p>
            </div>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-neutral-500">1주일 내 마감 일정이 없습니다.</p>
          ) : (
            <div className="divide-y divide-neutral-150">
              {upcomingDeadlines.map((ev) => {
                const dLeft = deadlineDaysLeft(ev)
                const urgency = dLeft <= 1 ? 'red' as const : dLeft <= 3 ? 'amber' as const : 'green' as const
                return (
                  <div key={ev.id} className="flex items-center gap-4 px-5 py-3">
                    <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_DOT[ev.color] || 'bg-neutral-400'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink">{ev.title}</p>
                        {ev.isDepartment && <Badge tone="brand">부서</Badge>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                        <span>{formatDateRange(ev)}</span>
                        {ev.time && <span>· {ev.time}</span>}
                        <span>· {COLOR_LABEL[ev.color] || ev.color}</span>
                        {ev.analyst && <span>· {ev.analyst}</span>}
                      </div>
                    </div>
                    <Badge tone={urgency}>
                      {dLeft === 0 ? 'D-Day' : dLeft < 0 ? `${-dLeft}일 초과` : `D-${dLeft}`}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 커버리지 만기 임박 */}
        <Card>
          <CardHeader title="커버리지 업데이트 임박 (6개월 룰)" />
          <div className="divide-y divide-neutral-150">
            {dueSoon.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-neutral-500">임박한 항목이 없습니다.</p>
            )}
            {dueSoonByAnalyst.map(([analyst, items]) => (
              <div key={analyst}>
                <button
                  onClick={() => toggleDue(analyst)}
                  className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
                      className={`text-neutral-500 transition-transform ${openDueAnalysts.has(analyst) ? 'rotate-90' : ''}`}>
                      <path d="M4 2l4 4-4 4z" />
                    </svg>
                    <span className="text-sm font-semibold text-ink">{analyst}</span>
                    <Badge tone="slate">{items.length}종목</Badge>
                  </div>
                  <Badge tone={dueTone(Math.min(...items.map((c) => c.days)))}>
                    {(() => { const m = Math.min(...items.map((c) => c.days)); return m < 0 ? `${-m}일 초과` : `D-${m}` })()}
                  </Badge>
                </button>
                {openDueAnalysts.has(analyst) && (
                  <div className="divide-y divide-neutral-150 bg-neutral-100/50">
                    {items.map((c) => (
                      <div key={c.id} className="flex items-center justify-between px-8 py-2.5">
                        <div>
                          <p className="text-sm text-ink">{c.name} <span className="text-neutral-500">{c.ticker}</span></p>
                          <p className="text-xs text-neutral-500">기한 {c.nextDue}</p>
                        </div>
                        <Badge tone={dueTone(c.days)}>
                          {c.days < 0 ? `${-c.days}일 초과` : `D-${c.days}`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* 괴리율 경고 */}
        <Card>
          <CardHeader title="괴리율 경고" />
          <div className="divide-y divide-neutral-150">
            {warnings.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-neutral-500">경고 없음</p>
            )}
            {warningsByAnalyst.map(([analyst, items]) => (
              <div key={analyst}>
                <button
                  onClick={() => toggleWarn(analyst)}
                  className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
                      className={`text-neutral-500 transition-transform ${openWarnAnalysts.has(analyst) ? 'rotate-90' : ''}`}>
                      <path d="M4 2l4 4-4 4z" />
                    </svg>
                    <span className="text-sm font-semibold text-ink">{analyst}</span>
                    <Badge tone="slate">{items.length}종목</Badge>
                  </div>
                </button>
                {openWarnAnalysts.has(analyst) && (
                  <div className="divide-y divide-neutral-150 bg-neutral-100/50">
                    {items.map((g) => (
                      <div key={g.id} className="flex items-center justify-between px-8 py-2.5">
                        <div>
                          <p className="text-sm text-ink">{g.name}</p>
                          <p className="text-xs text-neutral-500">{g.ticker}</p>
                        </div>
                        <Badge tone={gapTone(g.gapRatio)}>{formatPct(g.gapRatio)}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  )
}
