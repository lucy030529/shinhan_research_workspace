import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Badge } from '../components/ui'
import { useCoverage } from '../store/coverage'
import { useGapRatio } from '../store/gapRatio'
import { fetchProfiles } from '../store/auth'
import { daysUntil, dueTone, formatPct, formatWon, gapTone } from '../lib/utils'
import analystCoverageData from '../data/analyst-coverage.json'

const ANALYSTS = analystCoverageData.analysts as string[]

const OPINION_TONE: Record<string, 'brand' | 'green' | 'amber' | 'orange' | 'red' | 'slate'> = {
  '매수': 'brand',
  'TRADING BUY': 'green',
  '중립': 'slate',
}

const SPRING_SOFT = { type: 'spring' as const, stiffness: 300, damping: 30 }

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
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null)

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
      <div className="mb-8">
        <h1 className="text-xl font-bold text-ink">애널리스트 현황</h1>
        <p className="mt-1 text-sm text-neutral-500">애널리스트를 선택하면 커버리지 종목 상세를 확인할 수 있습니다.</p>
      </div>

      {/* ───────── 애널리스트 카드 그리드 ───────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {ANALYSTS.map((a, i) => {
          const p = profiles[a]
          const s = analystStats[a]
          const isActive = a === selectedAnalyst
          return (
            <motion.div
              key={a}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
            >
              <button
                onClick={() => { setSelectedAnalyst(isActive ? null : a); setSearchQuery(''); setExpandedTicker(null) }}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  isActive
                    ? 'border-brand-500 bg-brand-50 shadow-md shadow-brand-500/10'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  {p?.avatar?.startsWith('data:') ? (
                    <img src={p.avatar} alt="" className={`h-10 w-10 rounded-full object-cover ring-2 ${isActive ? 'ring-brand-300' : 'ring-neutral-200'}`} />
                  ) : (
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${isActive ? 'bg-brand-500' : 'bg-neutral-400'}`}>
                      {a[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`font-semibold ${isActive ? 'text-brand-700' : 'text-ink'}`}>{a}</p>
                    {p?.title && <p className="truncate text-[11px] text-neutral-400">{p.title}</p>}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                  <div>
                    <p className="text-[10px] text-neutral-400">종목</p>
                    <p className="text-sm font-bold tabular-nums text-ink">{s?.count || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400">매수</p>
                    <p className="text-sm font-bold tabular-nums text-brand-500">{s?.buyCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400">괴리율</p>
                    <p className={`text-sm font-bold tabular-nums ${s?.avgGap ? (s.avgGap > 0 ? 'text-red-500' : 'text-blue-500') : 'text-neutral-300'}`}>
                      {s?.avgGap ? `${s.avgGap > 0 ? '+' : ''}${s.avgGap}%` : '-'}
                    </p>
                  </div>
                </div>

                {s?.latestDate && (
                  <p className="mt-2 truncate text-[10px] text-neutral-400">
                    최근 {s.latestDate}
                  </p>
                )}
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* ───────── 선택된 애널리스트 종목 패널 ───────── */}
      <AnimatePresence>
        {selectedAnalyst && (
          <motion.div
            key={selectedAnalyst}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING_SOFT}
            className="overflow-hidden"
          >
            <div className="mt-6">
              {/* 패널 헤더 */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {(() => {
                    const p = profiles[selectedAnalyst]
                    return p?.avatar?.startsWith('data:')
                      ? <img src={p.avatar} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-brand-200" />
                      : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">{selectedAnalyst[0]}</div>
                  })()}
                  <h2 className="text-lg font-bold text-ink">{selectedAnalyst}</h2>
                  <span className="text-sm text-neutral-400">{analystEntries.length}개 종목</span>
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
                    className="w-56 rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* 종목 카드 */}
              <div className="space-y-2">
                {analystEntries.length === 0 && (
                  <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center text-sm text-neutral-400">
                    {searchQuery ? '검색 결과가 없습니다.' : '커버리지 종목이 없습니다.'}
                  </div>
                )}

                {analystEntries.map((e, i) => {
                  const daysLeft = e.nextDue ? daysUntil(e.nextDue) : 999
                  const dTone = dueTone(daysLeft)
                  const gTone = e.gapRatio !== 0 ? gapTone(e.gapRatio) : undefined
                  const isExpanded = expandedTicker === e.ticker

                  return (
                    <motion.div
                      key={e.ticker}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <div
                        className={`cursor-pointer rounded-xl border bg-white transition-all ${
                          isExpanded ? 'border-brand-200 shadow-md shadow-brand-500/5' : 'border-neutral-200/80 hover:border-neutral-300 hover:shadow-sm'
                        }`}
                        onClick={() => setExpandedTicker(isExpanded ? null : e.ticker)}
                      >
                        <div className="flex items-center gap-4 px-5 py-3.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-ink">{e.company}</span>
                              <span className="font-mono text-[11px] text-neutral-400">{e.ticker}</span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-neutral-400" title={e.title}>{e.title}</p>
                          </div>

                          <div className="hidden shrink-0 sm:block">
                            {e.opinion ? <Badge tone={OPINION_TONE[e.opinion] ?? 'slate'}>{e.opinion}</Badge> : <span className="text-xs text-neutral-300">-</span>}
                          </div>

                          <div className="hidden w-24 shrink-0 text-right md:block">
                            <p className="text-[10px] text-neutral-400">목표</p>
                            <p className="font-semibold tabular-nums text-ink">{e.targetPrice > 0 ? e.targetPrice.toLocaleString('ko-KR') : '-'}</p>
                          </div>

                          <div className="hidden w-24 shrink-0 text-right lg:block">
                            <p className="text-[10px] text-neutral-400">현재가</p>
                            <p className="tabular-nums text-neutral-600">{e.currentPrice > 0 ? e.currentPrice.toLocaleString('ko-KR') : '-'}</p>
                          </div>

                          <div className="w-16 shrink-0 text-right">
                            {gTone ? <Badge tone={gTone}>{formatPct(e.gapRatio)}</Badge> : <span className="text-xs text-neutral-300">-</span>}
                          </div>

                          <div className="hidden w-20 shrink-0 text-center lg:block">
                            <p className="text-xs tabular-nums text-neutral-500">{e.lastUpdated.slice(5)}</p>
                          </div>

                          <div className="hidden w-16 shrink-0 text-center sm:block">
                            {e.nextDue ? (
                              <Badge tone={dTone}>{daysLeft <= 0 ? `+${Math.abs(daysLeft)}` : `D-${daysLeft}`}</Badge>
                            ) : <span className="text-xs text-neutral-300">-</span>}
                          </div>

                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 text-neutral-400">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                          </motion.div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={SPRING_SOFT}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-neutral-100 bg-neutral-50/50 px-5 py-4">
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                                  <Detail label="투자의견" value={e.opinion || '-'} />
                                  <Detail label="목표주가" value={e.targetPrice > 0 ? formatWon(e.targetPrice) : '-'} />
                                  <Detail label="현재가" value={e.currentPrice > 0 ? formatWon(e.currentPrice) : '-'} />
                                  <Detail label="괴리율" value={e.gapRatio !== 0 ? formatPct(e.gapRatio) : '-'} highlight={gTone} />
                                  <Detail label="최종 발간일" value={e.lastUpdated} />
                                  <Detail label="커버리지 기한" value={e.nextDue ? (daysLeft <= 0 ? `${e.nextDue} (${Math.abs(daysLeft)}일 초과)` : `${e.nextDue} (D-${daysLeft})`) : '-'} highlight={dTone === 'red' ? 'red' : undefined} />
                                </div>
                                {e.analystFull !== e.analyst && (
                                  <p className="mt-3 text-[11px] text-neutral-400">공동 집필: {e.analystFull}</p>
                                )}
                                <p className="mt-2 text-xs text-neutral-500">최종 리포트: <span className="font-medium text-neutral-700">{e.title}</span></p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {analystEntries.length > 0 && (
                <p className="mt-4 text-center text-xs text-neutral-400">현재가 · 괴리율은 대시보드 동기화 데이터 기준</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Detail({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  const colorMap: Record<string, string> = { red: 'text-red-600', orange: 'text-orange-600', amber: 'text-amber-600', green: 'text-emerald-600', brand: 'text-brand-600' }
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${highlight ? colorMap[highlight] || 'text-ink' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
