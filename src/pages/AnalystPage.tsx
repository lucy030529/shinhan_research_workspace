import { useEffect, useMemo, useState } from 'react'
import { Badge, Card, PageHeader } from '../components/ui'
import { useCoverage } from '../store/coverage'
import { useGapRatio } from '../store/gapRatio'
import { fetchProfiles } from '../store/auth'
import { daysUntil, dueTone, formatPct, formatWon, gapTone } from '../lib/utils'
import analystCoverageData from '../data/analyst-coverage.json'

const ANALYSTS = analystCoverageData.analysts as string[]

const OPINION_BADGE: Record<string, 'brand' | 'green' | 'amber' | 'orange' | 'red' | 'slate'> = {
  '매수': 'brand',
  'TRADING BUY': 'green',
  '중립': 'slate',
  '': 'slate',
}

function opinionTone(op: string) {
  return OPINION_BADGE[op] ?? 'slate'
}

interface CoverageEntry {
  ticker: string
  company: string
  analyst: string
  analystFull: string
  lastUpdated: string
  opinion: string
  targetPrice: number
  title: string
  currentPrice: number
  gapRatio: number
  nextDue: string
}

export default function AnalystPage() {
  const coverageItems = useCoverage((s) => s.items)
  const gapItems = useGapRatio((s) => s.items)
  const [selectedAnalyst, setSelectedAnalyst] = useState(ANALYSTS[0])
  const [profiles, setProfiles] = useState<Record<string, { name: string; avatar?: string; title?: string; department?: string }>>({})
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { fetchProfiles().then(setProfiles) }, [])

  const mergedData = useMemo(() => {
    const gapMap = new Map(gapItems.map((g) => [g.ticker, g]))
    const covMap = new Map(coverageItems.map((c) => [c.ticker, c]))

    const entries: CoverageEntry[] = analystCoverageData.coverage
      .filter((e) => (e as Record<string, unknown>).ticker)
      .map((e) => {
        const ticker = (e as Record<string, unknown>).ticker as string
        const gap = gapMap.get(ticker)
        const cov = covMap.get(ticker)
        return {
          ticker,
          company: e.company,
          analyst: e.analyst,
          analystFull: e.analystFull,
          lastUpdated: cov?.lastUpdated || e.lastUpdated,
          opinion: e.opinion,
          targetPrice: gap?.targetPrice || e.targetPrice,
          title: e.title,
          currentPrice: gap?.currentPrice || 0,
          gapRatio: gap?.gapRatio || 0,
          nextDue: cov?.nextDue || '',
        }
      })
    return entries
  }, [gapItems, coverageItems])

  const analystEntries = useMemo(() => {
    let items = mergedData.filter((e) => e.analyst === selectedAnalyst)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      items = items.filter((e) => e.company.toLowerCase().includes(q) || e.ticker.includes(q))
    }
    return items.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
  }, [mergedData, selectedAnalyst, searchQuery])

  const analystStats = useMemo(() => {
    const stats: Record<string, { count: number; buyCount: number; avgGap: number; overdueCount: number; latestDate: string }> = {}
    for (const a of ANALYSTS) {
      const items = mergedData.filter((e) => e.analyst === a)
      const buys = items.filter((e) => e.opinion === '매수')
      const withGap = items.filter((e) => e.gapRatio !== 0)
      const avgGap = withGap.length > 0 ? withGap.reduce((s, e) => s + e.gapRatio, 0) / withGap.length : 0
      const overdue = items.filter((e) => e.nextDue && daysUntil(e.nextDue) <= 14)
      const latest = items.reduce((max, e) => e.lastUpdated > max ? e.lastUpdated : max, '')
      stats[a] = { count: items.length, buyCount: buys.length, avgGap: +avgGap.toFixed(1), overdueCount: overdue.length, latestDate: latest }
    }
    return stats
  }, [mergedData])

  const profile = profiles[selectedAnalyst]
  const stats = analystStats[selectedAnalyst]

  return (
    <div>
      <PageHeader title="애널리스트 현황" description="애널리스트별 커버리지 종목, 목표주가, 괴리율, 최종발간일자를 종합 확인합니다." />

      {/* 애널리스트 탭 */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {ANALYSTS.map((a) => {
          const p = profiles[a]
          const s = analystStats[a]
          const isActive = a === selectedAnalyst
          return (
            <button
              key={a}
              onClick={() => { setSelectedAnalyst(a); setSearchQuery('') }}
              className={`group relative flex shrink-0 items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              {p?.avatar?.startsWith('data:') ? (
                <img src={p.avatar} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-white" />
              ) : (
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${isActive ? 'bg-brand-500' : 'bg-neutral-400'}`}>
                  {a[0]}
                </div>
              )}
              <div className="text-left">
                <p className="leading-tight">{a}</p>
                <p className={`text-[10px] ${isActive ? 'text-brand-500' : 'text-neutral-400'}`}>
                  {s?.count || 0}종목
                </p>
              </div>
              {(s?.overdueCount || 0) > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {s.overdueCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 선택된 애널리스트 프로필 + 요약 */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* 프로필 카드 */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-4 p-5">
            {profile?.avatar?.startsWith('data:') ? (
              <img src={profile.avatar} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-neutral-200" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-2xl font-bold text-white">
                {selectedAnalyst[0]}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-ink">{selectedAnalyst}</h2>
              {profile?.title && <p className="text-sm text-neutral-500">{profile.title}</p>}
              {profile?.department && <p className="text-xs text-neutral-400">{profile.department}</p>}
              {stats?.latestDate && (
                <p className="mt-1 text-xs text-neutral-400">
                  최근 발간: <span className="font-medium text-neutral-600">{stats.latestDate}</span>
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* 통계 카드들 */}
        <Card className="flex items-center justify-center p-5">
          <div className="text-center">
            <p className="text-xs font-medium text-neutral-500">커버리지</p>
            <p className="mt-1 text-2xl font-bold text-ink">{stats?.count || 0}<span className="text-base font-normal text-neutral-400"> 종목</span></p>
          </div>
        </Card>
        <Card className="flex items-center justify-center p-5">
          <div className="text-center">
            <p className="text-xs font-medium text-neutral-500">매수의견</p>
            <p className="mt-1 text-2xl font-bold text-brand-500">{stats?.buyCount || 0}<span className="text-base font-normal text-neutral-400"> 종목</span></p>
          </div>
        </Card>
        <Card className="flex items-center justify-center p-5">
          <div className="text-center">
            <p className="text-xs font-medium text-neutral-500">평균 괴리율</p>
            <p className={`mt-1 text-2xl font-bold ${stats?.avgGap ? (stats.avgGap > 0 ? 'text-red-500' : 'text-blue-500') : 'text-neutral-400'}`}>
              {stats?.avgGap ? formatPct(stats.avgGap) : '-'}
            </p>
          </div>
        </Card>
      </div>

      {/* 검색바 */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="종목명 또는 종목코드 검색..."
          className="w-full max-w-sm rounded-lg border border-neutral-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* 종목 테이블 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-150 bg-neutral-50/60">
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">종목명</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">코드</th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-600">투자의견</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">목표주가</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">현재가</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">괴리율</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">최종 리포트</th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-600">발간일</th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-600">기한</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {analystEntries.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-neutral-400">
                    {searchQuery ? '검색 결과가 없습니다.' : '커버리지 종목이 없습니다.'}
                  </td>
                </tr>
              )}
              {analystEntries.map((e) => {
                const daysLeft = e.nextDue ? daysUntil(e.nextDue) : 999
                const dTone = dueTone(daysLeft)
                const gTone = e.gapRatio !== 0 ? gapTone(e.gapRatio) : 'slate'
                return (
                  <tr key={e.ticker} className="group transition-colors hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{e.company}</div>
                      {e.analystFull !== e.analyst && (
                        <div className="text-[10px] text-neutral-400">공동: {e.analystFull}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">{e.ticker}</td>
                    <td className="px-4 py-3 text-center">
                      {e.opinion ? (
                        <Badge tone={opinionTone(e.opinion)}>{e.opinion}</Badge>
                      ) : (
                        <span className="text-xs text-neutral-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-ink">
                      {e.targetPrice > 0 ? formatWon(e.targetPrice) : <span className="text-neutral-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-600">
                      {e.currentPrice > 0 ? formatWon(e.currentPrice) : <span className="text-neutral-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.gapRatio !== 0 ? (
                        <Badge tone={gTone}>{formatPct(e.gapRatio)}</Badge>
                      ) : (
                        <span className="text-xs text-neutral-300">-</span>
                      )}
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      <p className="truncate text-xs text-neutral-600" title={e.title}>{e.title || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-xs tabular-nums text-neutral-600">
                      {e.lastUpdated}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.nextDue ? (
                        <Badge tone={dTone}>
                          {daysLeft <= 0 ? `${Math.abs(daysLeft)}일 초과` : `D-${daysLeft}`}
                        </Badge>
                      ) : (
                        <span className="text-xs text-neutral-300">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {analystEntries.length > 0 && (
          <div className="border-t border-neutral-150 px-4 py-2.5 text-xs text-neutral-400">
            총 {analystEntries.length}개 종목 · 현재가·괴리율은 대시보드 동기화 데이터 기준
          </div>
        )}
      </Card>
    </div>
  )
}
