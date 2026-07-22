import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Badge, Card } from '../components/ui'
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

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 35 }
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
  const [selectedAnalyst, setSelectedAnalyst] = useState(ANALYSTS[0])
  const [hoveredAnalyst, setHoveredAnalyst] = useState<string | null>(null)
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
        } satisfies CoverageEntry
      })
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
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-ink">애널리스트 현황</h1>
        <p className="mt-1 text-sm text-neutral-500">커버리지 종목, 목표주가, 괴리율, 최종발간일자를 한눈에 확인합니다.</p>
      </div>

      {/* ───────── 애널리스트 셀렉터 바 ───────── */}
      <div className="mb-8 rounded-2xl border border-neutral-200/80 bg-white p-1.5 shadow-sm">
        <nav
          className="flex gap-0.5 overflow-x-auto"
          onMouseLeave={() => setHoveredAnalyst(null)}
        >
          {ANALYSTS.map((a) => {
            const p = profiles[a]
            const s = analystStats[a]
            const isActive = a === selectedAnalyst
            return (
              <button
                key={a}
                onClick={() => { setSelectedAnalyst(a); setSearchQuery(''); setExpandedTicker(null) }}
                onMouseEnter={() => setHoveredAnalyst(a)}
                className="relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
              >
                {/* 호버 하이라이트 글라이딩 */}
                {hoveredAnalyst === a && !isActive && (
                  <motion.span
                    layoutId="analyst-hover"
                    className="absolute inset-0 -z-10 rounded-xl bg-neutral-100/80"
                    transition={SPRING}
                  />
                )}
                {/* 선택 상태 */}
                {isActive && (
                  <motion.span
                    layoutId="analyst-active"
                    className="absolute inset-0 -z-10 rounded-xl bg-brand-500 shadow-md shadow-brand-500/25"
                    transition={SPRING}
                  />
                )}
                {p?.avatar?.startsWith('data:') ? (
                  <img src={p.avatar} alt="" className={`h-6 w-6 rounded-full object-cover ring-2 ${isActive ? 'ring-white/50' : 'ring-neutral-200'}`} />
                ) : (
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-neutral-200 text-neutral-500'
                  }`}>
                    {a[0]}
                  </div>
                )}
                <span className={isActive ? 'text-white' : ''}>
                  {a}
                </span>
                <span className={`text-[10px] tabular-nums ${isActive ? 'text-white/70' : 'text-neutral-400'}`}>
                  {s?.count || 0}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* ───────── 프로필 + 통계 패널 (언폴드) ───────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedAnalyst}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-6"
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* 프로필 */}
            <Card className="lg:col-span-5">
              <div className="flex items-center gap-5 p-5">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={SPRING_SOFT}
                >
                  {profile?.avatar?.startsWith('data:') ? (
                    <img src={profile.avatar} alt="" className="h-[72px] w-[72px] rounded-2xl object-cover ring-2 ring-neutral-200/60 shadow-lg" />
                  ) : (
                    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white shadow-lg shadow-brand-500/20">
                      {selectedAnalyst[0]}
                    </div>
                  )}
                </motion.div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-ink">{selectedAnalyst}</h2>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {profile?.title && (
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{profile.title}</span>
                    )}
                    {profile?.department && (
                      <span className="text-xs text-neutral-400">{profile.department}</span>
                    )}
                  </div>
                  {stats?.latestDate && (
                    <p className="mt-2 text-xs text-neutral-400">
                      최근 발간 <span className="ml-1 font-semibold text-neutral-600">{stats.latestDate}</span>
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* 통계 그리드 */}
            <div className="grid grid-cols-2 gap-3 lg:col-span-7 lg:grid-cols-4">
              {[
                { label: '커버리지', value: `${stats?.count || 0}`, unit: '종목', color: 'text-ink' },
                { label: '매수의견', value: `${stats?.buyCount || 0}`, unit: '종목', color: 'text-brand-500' },
                { label: '평균 괴리율', value: stats?.avgGap ? formatPct(stats.avgGap) : '-', unit: '', color: stats?.avgGap ? (stats.avgGap > 0 ? 'text-red-500' : 'text-blue-500') : 'text-neutral-400' },
                { label: '기한 임박', value: `${stats?.overdueCount || 0}`, unit: '종목', color: (stats?.overdueCount || 0) > 0 ? 'text-red-500' : 'text-emerald-500' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.06 * i }}
                >
                  <Card className="p-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">{stat.label}</p>
                    <p className={`mt-1.5 text-xl font-bold tabular-nums ${stat.color}`}>
                      {stat.value}
                      {stat.unit && <span className="ml-0.5 text-xs font-normal text-neutral-400">{stat.unit}</span>}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ───────── 검색 + 필터 ───────── */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="종목명 · 종목코드 검색"
            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm transition-shadow focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <span className="text-xs tabular-nums text-neutral-400">
          {analystEntries.length}개 종목
        </span>
      </div>

      {/* ───────── 종목 카드 리스트 ───────── */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {analystEntries.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-16"
            >
              <p className="text-sm text-neutral-400">{searchQuery ? '검색 결과가 없습니다.' : '커버리지 종목이 없습니다.'}</p>
            </motion.div>
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
              >
                <div
                  className={`group cursor-pointer rounded-xl border bg-white transition-all ${
                    isExpanded ? 'border-brand-200 shadow-md shadow-brand-500/5' : 'border-neutral-200/80 hover:border-neutral-300 hover:shadow-sm'
                  }`}
                  onClick={() => setExpandedTicker(isExpanded ? null : e.ticker)}
                >
                  {/* 메인 행 */}
                  <div className="flex items-center gap-4 px-5 py-3.5">
                    {/* 종목명 + 코드 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{e.company}</span>
                        <span className="font-mono text-[11px] text-neutral-400">{e.ticker}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-neutral-400" title={e.title}>{e.title}</p>
                    </div>

                    {/* 투자의견 */}
                    <div className="hidden shrink-0 sm:block">
                      {e.opinion ? (
                        <Badge tone={OPINION_TONE[e.opinion] ?? 'slate'}>{e.opinion}</Badge>
                      ) : (
                        <span className="text-xs text-neutral-300">-</span>
                      )}
                    </div>

                    {/* 목표주가 */}
                    <div className="hidden w-24 shrink-0 text-right md:block">
                      <p className="text-[10px] text-neutral-400">목표</p>
                      <p className="font-semibold tabular-nums text-ink">
                        {e.targetPrice > 0 ? e.targetPrice.toLocaleString('ko-KR') : '-'}
                      </p>
                    </div>

                    {/* 현재가 */}
                    <div className="hidden w-24 shrink-0 text-right lg:block">
                      <p className="text-[10px] text-neutral-400">현재가</p>
                      <p className="tabular-nums text-neutral-600">
                        {e.currentPrice > 0 ? e.currentPrice.toLocaleString('ko-KR') : '-'}
                      </p>
                    </div>

                    {/* 괴리율 */}
                    <div className="w-16 shrink-0 text-right">
                      {gTone ? (
                        <Badge tone={gTone}>{formatPct(e.gapRatio)}</Badge>
                      ) : (
                        <span className="text-xs text-neutral-300">-</span>
                      )}
                    </div>

                    {/* 발간일 */}
                    <div className="hidden w-20 shrink-0 text-center lg:block">
                      <p className="text-xs tabular-nums text-neutral-500">{e.lastUpdated.slice(5)}</p>
                    </div>

                    {/* 기한 */}
                    <div className="hidden w-16 shrink-0 text-center sm:block">
                      {e.nextDue ? (
                        <Badge tone={dTone}>
                          {daysLeft <= 0 ? `+${Math.abs(daysLeft)}` : `D-${daysLeft}`}
                        </Badge>
                      ) : (
                        <span className="text-xs text-neutral-300">-</span>
                      )}
                    </div>

                    {/* 펼침 화살표 */}
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0 text-neutral-400"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </motion.div>
                  </div>

                  {/* 확장 패널 */}
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
                          <p className="mt-2 text-xs text-neutral-500">
                            최종 리포트: <span className="font-medium text-neutral-700">{e.title}</span>
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {analystEntries.length > 0 && (
        <p className="mt-4 text-center text-xs text-neutral-400">
          현재가 · 괴리율은 대시보드 동기화 데이터 기준
        </p>
      )}
    </div>
  )
}

function Detail({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  const colorMap: Record<string, string> = {
    red: 'text-red-600',
    orange: 'text-orange-600',
    amber: 'text-amber-600',
    green: 'text-emerald-600',
    brand: 'text-brand-600',
  }
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${highlight ? colorMap[highlight] || 'text-ink' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
