import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Badge } from '../components/ui'
import { useCoverage } from '../store/coverage'
import { useGapRatio } from '../store/gapRatio'
import { fetchProfiles } from '../store/auth'
import { daysUntil, dueTone, formatPct, gapTone } from '../lib/utils'
import analystCoverageData from '../data/analyst-coverage.json'

const ANALYSTS = analystCoverageData.analysts as string[]

const OPINION_TONE: Record<string, 'brand' | 'green' | 'amber' | 'orange' | 'red' | 'slate'> = {
  '매수': 'brand',
  'TRADING BUY': 'green',
  '중립': 'slate',
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
  const [selectedAnalyst, setSelectedAnalyst] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Record<string, { name: string; avatar?: string; title?: string; department?: string }>>({})
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { fetchProfiles().then(setProfiles) }, [])

  const mergedData = useMemo(() => {
    const gapMap = new Map(gapItems.map((g) => [g.ticker, g]))
    const covMap = new Map(coverageItems.map((c) => [c.ticker, c]))
    return (analystCoverageData.coverage as Array<{ company: string; analyst: string; analystFull: string; lastUpdated: string; opinion: string; targetPrice: number; title: string; ticker?: string }>)
      .filter((e) => e.ticker)
      .map((e) => {
        const ticker = e.ticker!
        const gap = gapMap.get(ticker)
        const cov = covMap.get(ticker)
        return {
          ticker, company: e.company, analyst: e.analyst, analystFull: e.analystFull,
          lastUpdated: cov?.lastUpdated || e.lastUpdated, opinion: e.opinion,
          targetPrice: gap?.targetPrice || e.targetPrice, title: e.title,
          currentPrice: gap?.currentPrice || 0, gapRatio: gap?.gapRatio || 0,
          nextDue: cov?.nextDue || '',
        } satisfies CoverageEntry
      })
  }, [gapItems, coverageItems])

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

  const analystEntries = useMemo(() => {
    if (!selectedAnalyst) return []
    let items = mergedData.filter((e) => e.analyst === selectedAnalyst)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      items = items.filter((e) => e.company.toLowerCase().includes(q) || e.ticker.includes(q))
    }
    return items.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
  }, [mergedData, selectedAnalyst, searchQuery])

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-xl font-bold text-ink">애널리스트 현황</h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500">애널리스트를 선택하면 커버리지 종목 상세를 확인할 수 있습니다.</p>
      </div>

      {/* 애널리스트 카드 그리드 — 모바일에서 컴팩트하게 */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {ANALYSTS.map((a) => {
          const p = profiles[a]
          const s = analystStats[a]
          const isActive = a === selectedAnalyst
          return (
            <button
              key={a}
              onClick={() => { setSelectedAnalyst(isActive ? null : a); setSearchQuery('') }}
              className={`w-full rounded-xl border p-3 sm:p-4 text-left transition-all ${
                isActive
                  ? a === '김아람'
                    ? 'border-pink-400 bg-pink-50 shadow-md shadow-pink-400/10'
                    : 'border-brand-500 bg-brand-50 shadow-md shadow-brand-500/10'
                  : a === '김아람'
                    ? 'border-pink-200 bg-pink-50/40 hover:border-pink-300 hover:shadow-sm'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                {p?.avatar?.startsWith('data:') ? (
                  <img src={p.avatar} alt="" className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover ring-2 ${isActive ? (a === '김아람' ? 'ring-pink-300' : 'ring-brand-300') : 'ring-neutral-200'}`} />
                ) : (
                  <div className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-white ${isActive ? (a === '김아람' ? 'bg-pink-400' : 'bg-brand-500') : (a === '김아람' ? 'bg-pink-300' : 'bg-neutral-400')}`}>
                    {a[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className={`text-sm sm:text-base font-semibold ${isActive ? (a === '김아람' ? 'text-pink-600' : 'text-brand-700') : 'text-ink'}`}>{a}</p>
                  {p?.title && <p className="truncate text-[10px] sm:text-[11px] text-neutral-400">{p.title}</p>}
                </div>
              </div>
              <div className="mt-2 sm:mt-3 grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-[9px] sm:text-[10px] text-neutral-400">종목</p>
                  <p className="text-xs sm:text-sm font-bold tabular-nums text-ink">{s?.count || 0}</p>
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-neutral-400">매수</p>
                  <p className="text-xs sm:text-sm font-bold tabular-nums text-brand-500">{s?.buyCount || 0}</p>
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-neutral-400">괴리율</p>
                  <p className={`text-xs sm:text-sm font-bold tabular-nums ${s?.avgGap ? (s.avgGap > 0 ? 'text-red-500' : 'text-blue-500') : 'text-neutral-300'}`}>
                    {s?.avgGap ? `${s.avgGap > 0 ? '+' : ''}${s.avgGap}%` : '-'}
                  </p>
                </div>
              </div>
              {s?.latestDate && (
                <p className="mt-1.5 sm:mt-2 truncate text-[9px] sm:text-[10px] text-neutral-400">최근 {s.latestDate}</p>
              )}
            </button>
          )
        })}
      </div>

      {/* 선택된 애널리스트 종목 테이블 */}
      <AnimatePresence>
        {selectedAnalyst && (
          <motion.div
            key={selectedAnalyst}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mt-4 sm:mt-6">
              <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  {(() => {
                    const p = profiles[selectedAnalyst]
                    return p?.avatar?.startsWith('data:')
                      ? <img src={p.avatar} alt="" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover ring-2 ring-brand-200" />
                      : <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">{selectedAnalyst[0]}</div>
                  })()}
                  <h2 className="text-base sm:text-lg font-bold text-ink">{selectedAnalyst}</h2>
                  <span className="text-xs sm:text-sm text-neutral-400">{analystEntries.length}개 종목</span>
                </div>
                <div className="relative">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="종목 검색"
                    className="w-full sm:w-56 rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* 데스크톱: 테이블 / 모바일: 카드 */}
              {analystEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center text-sm text-neutral-400">
                  {searchQuery ? '검색 결과가 없습니다.' : '커버리지 종목이 없습니다.'}
                </div>
              ) : (
                <>
                  {/* 데스크톱 테이블 */}
                  <div className="hidden overflow-x-auto rounded-xl border border-neutral-200 bg-white md:block">
                    <table className="w-full min-w-[700px] text-sm">
                      <thead>
                        <tr className="border-b border-neutral-150 bg-neutral-50/60">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500">종목명</th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold text-neutral-500">의견</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-500">목표주가</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-500">현재가</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-500">괴리율</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-neutral-500">최종 리포트</th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold text-neutral-500">발간일</th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold text-neutral-500">기한</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {analystEntries.map((e) => {
                          const daysLeft = e.nextDue ? daysUntil(e.nextDue) : 999
                          const dTone = dueTone(daysLeft)
                          const gTone = e.gapRatio !== 0 ? gapTone(e.gapRatio) : undefined
                          return (
                            <tr key={e.ticker} className="transition-colors hover:bg-neutral-50">
                              <td className="px-4 py-2.5">
                                <span className="font-medium text-ink">{e.company}</span>
                                <span className="ml-1.5 font-mono text-[11px] text-neutral-400">{e.ticker}</span>
                                {e.analystFull !== e.analyst && (
                                  <span className="ml-1.5 text-[10px] text-neutral-400">({e.analystFull})</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {e.opinion ? <Badge tone={OPINION_TONE[e.opinion] ?? 'slate'}>{e.opinion}</Badge> : <span className="text-neutral-300">-</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium tabular-nums text-ink">
                                {e.targetPrice > 0 ? e.targetPrice.toLocaleString('ko-KR') : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">
                                {e.currentPrice > 0 ? e.currentPrice.toLocaleString('ko-KR') : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                {gTone ? <Badge tone={gTone}>{formatPct(e.gapRatio)}</Badge> : <span className="text-neutral-300">-</span>}
                              </td>
                              <td className="max-w-[180px] px-3 py-2.5">
                                <p className="truncate text-xs text-neutral-500" title={e.title}>{e.title}</p>
                              </td>
                              <td className="px-3 py-2.5 text-center text-xs tabular-nums text-neutral-500">{e.lastUpdated}</td>
                              <td className="px-3 py-2.5 text-center">
                                {e.nextDue ? (
                                  <Badge tone={dTone}>{daysLeft <= 0 ? `+${Math.abs(daysLeft)}` : `D-${daysLeft}`}</Badge>
                                ) : <span className="text-neutral-300">-</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 모바일 카드 */}
                  <div className="space-y-2 md:hidden">
                    {analystEntries.map((e) => {
                      const daysLeft = e.nextDue ? daysUntil(e.nextDue) : 999
                      const dTone = dueTone(daysLeft)
                      const gTone = e.gapRatio !== 0 ? gapTone(e.gapRatio) : undefined
                      return (
                        <div key={e.ticker} className="rounded-xl border border-neutral-200 bg-white p-3">
                          {/* 헤더: 종목명 + 의견 */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink">{e.company}</p>
                              <p className="text-[11px] text-neutral-400">{e.ticker}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {e.opinion && <Badge tone={OPINION_TONE[e.opinion] ?? 'slate'}>{e.opinion}</Badge>}
                              {e.nextDue && <Badge tone={dTone}>{daysLeft <= 0 ? `+${Math.abs(daysLeft)}` : `D-${daysLeft}`}</Badge>}
                            </div>
                          </div>
                          {/* 가격 정보 */}
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            <span className="text-neutral-400">목표</span>
                            <span className="font-semibold tabular-nums text-ink">{e.targetPrice > 0 ? e.targetPrice.toLocaleString('ko-KR') : '-'}</span>
                            <span className="text-neutral-300">|</span>
                            <span className="text-neutral-400">현재</span>
                            <span className="font-semibold tabular-nums text-neutral-600">{e.currentPrice > 0 ? e.currentPrice.toLocaleString('ko-KR') : '-'}</span>
                            {gTone && (
                              <>
                                <span className="text-neutral-300">|</span>
                                <Badge tone={gTone}>{formatPct(e.gapRatio)}</Badge>
                              </>
                            )}
                          </div>
                          {/* 리포트 */}
                          <p className="mt-1.5 truncate text-[11px] text-neutral-400">
                            {e.lastUpdated} · {e.title}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {analystEntries.length > 0 && (
                <p className="mt-3 sm:mt-4 text-center text-[10px] sm:text-xs text-neutral-400">현재가 · 괴리율은 대시보드 동기화 데이터 기준</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
