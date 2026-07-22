import { useEffect, useMemo, useState } from 'react'
import { Badge, Card, PageHeader, StatTile } from '../components/ui'
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
          const covUpdated = syncFromReports(reports.map((r) => ({ ticker: r.ticker, name: r.company, date: r.date })))
          const gapUpdated = syncTargetPrices(reports.map((r) => ({ ticker: r.ticker, name: r.company, targetPrice: r.targetPrice })))
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
  const todayStr = new Date().toISOString().slice(0, 10)
  const weekLaterStr = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })()

  const upcomingDeadlines = useMemo(() => {
    return calendarEvents
      .filter((ev) => {
        const evDate = ev.endDate || ev.date
        return evDate >= todayStr && ev.date <= weekLaterStr
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [calendarEvents, todayStr, weekLaterStr])

  const tickerAnalystMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of coverageItems) {
      if (c.ticker) map.set(c.ticker, c.analyst || '미지정')
    }
    return map
  }, [coverageItems])

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
          <div className="flex items-center justify-between border-b border-neutral-150 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-ink">커버리지 업데이트 임박</h3>
            {dueSoon.length > 0 && (
              <a href="/coverage" className="text-xs text-brand-500 hover:underline">전체 보기 →</a>
            )}
          </div>
          {dueSoon.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-neutral-500">임박한 항목이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-150 text-center text-xs text-neutral-500">
                    <th className="px-4 py-2 text-left font-medium">종목</th>
                    <th className="px-4 py-2 font-medium">담당</th>
                    <th className="px-4 py-2 font-medium">기한</th>
                    <th className="px-4 py-2 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150">
                  {dueSoon.slice(0, 8).map((c) => (
                    <tr key={c.id} className={`${c.days <= 0 ? 'bg-red-50/50' : c.days <= 14 ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-2.5 text-left">
                        <p className="font-medium text-ink">{c.name}</p>
                        <p className="text-xs text-neutral-400">{c.ticker}</p>
                      </td>
                      <td className="px-4 py-2.5 text-center text-neutral-600">{c.analyst}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-neutral-600">{c.nextDue}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge tone={dueTone(c.days)}>
                          {c.days < 0 ? `${-c.days}일 초과` : `D-${c.days}`}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dueSoon.length > 8 && (
                <div className="border-t border-neutral-150 px-4 py-2.5 text-center">
                  <a href="/coverage" className="text-xs text-brand-500 hover:underline">+{dueSoon.length - 8}건 더 보기</a>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* 괴리율 경고 */}
        <Card>
          <div className="flex items-center justify-between border-b border-neutral-150 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-ink">괴리율 경고</h3>
            {warnings.length > 0 && (
              <a href="/gap-ratio" className="text-xs text-brand-500 hover:underline">전체 보기 →</a>
            )}
          </div>
          {warnings.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-neutral-500">경고 없음</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-150 text-center text-xs text-neutral-500">
                    <th className="px-4 py-2 text-left font-medium">종목</th>
                    <th className="px-4 py-2 font-medium">담당</th>
                    <th className="px-4 py-2 font-medium">괴리율</th>
                    <th className="px-4 py-2 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150">
                  {[...warnings].sort((a, b) => Math.abs(b.gapRatio) - Math.abs(a.gapRatio)).slice(0, 8).map((g) => {
                    const tone = gapTone(g.gapRatio)
                    return (
                      <tr key={g.id} className={`${tone === 'red' ? 'bg-red-50/50' : tone === 'orange' ? 'bg-orange-50/40' : ''}`}>
                        <td className="px-4 py-2.5 text-left">
                          <p className="font-medium text-ink">{g.name}</p>
                          <p className="text-xs text-neutral-400">{g.ticker}</p>
                        </td>
                        <td className="px-4 py-2.5 text-center text-neutral-600">{tickerAnalystMap.get(g.ticker) || '미지정'}</td>
                        <td className={`px-4 py-2.5 text-center font-bold tabular-nums ${tone === 'red' ? 'text-red-600' : tone === 'orange' ? 'text-orange-600' : 'text-amber-600'}`}>
                          {formatPct(g.gapRatio)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge tone={tone === 'red' ? 'red' : tone === 'orange' ? 'orange' : 'amber'}>
                            {tone === 'red' ? '위험' : tone === 'orange' ? '경고' : '주의'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {warnings.length > 8 && (
                <div className="border-t border-neutral-150 px-4 py-2.5 text-center">
                  <a href="/gap-ratio" className="text-xs text-brand-500 hover:underline">+{warnings.length - 8}건 더 보기</a>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

    </div>
  )
}
