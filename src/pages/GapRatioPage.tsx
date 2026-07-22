import { useMemo, useState } from 'react'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { useCoverage } from '../store/coverage'
import { useGapRatio } from '../store/gapRatio'
import { useAuth } from '../store/auth'
import { formatPct, formatWon, gapTone } from '../lib/utils'
import { fetchStockPrices } from '../lib/api'
import GapRatioModal from '../components/gapRatio/GapRatioModal'
import type { GapRatioItem } from '../types'

export default function GapRatioPage() {
  const rawItems = useGapRatio((s) => s.items)
  const lastRefreshed = useGapRatio((s) => s.lastRefreshed)
  const upsert = useGapRatio((s) => s.upsert)
  const remove = useGapRatio((s) => s.remove)
  const refreshPrices = useGapRatio((s) => s.refreshPrices)
  const rawCoverage = useCoverage((s) => s.items)
  const user = useAuth((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const [modal, setModal] = useState<'add' | GapRatioItem | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [analystFilter, setAnalystFilter] = useState('')
  const [pageSize, setPageSize] = useState(15)
  const [page, setPage] = useState(1)
  const [activePill, setActivePill] = useState<'all' | 'red' | 'orange' | 'amber'>('all')

  // 방어적: items가 배열이 아닌 경우 빈 배열 사용
  const items = Array.isArray(rawItems) ? rawItems : []
  const coverageItems = Array.isArray(rawCoverage) ? rawCoverage : []

  const tickerAnalystMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of coverageItems) {
      if (c?.ticker) map.set(c.ticker, c.analyst || '미지정')
    }
    return map
  }, [coverageItems])

  const analysts = useMemo(() => {
    const set = new Set<string>()
    for (const g of items) {
      if (g?.ticker) set.add(tickerAnalystMap.get(g.ticker) || '미지정')
    }
    return [...set].sort()
  }, [items, tickerAnalystMap])

  async function handleRefreshPrices() {
    if (items.length === 0) return
    setRefreshing(true)
    try {
      const tickers = items.map((g) => g.ticker)
      const prices = await fetchStockPrices(tickers)
      refreshPrices(prices.map((p) => ({ ticker: p.ticker, currentPrice: p.currentPrice })))
    } catch (e) {
      alert(e instanceof Error ? e.message : '주가 조회 실패')
    } finally {
      setRefreshing(false)
    }
  }

  const safeGap = (n: unknown) => (typeof n === 'number' && isFinite(n) ? n : 0)

  const rows = [...items]
    .filter((g) => g && (!analystFilter || (tickerAnalystMap.get(g.ticker) || '미지정') === analystFilter))
    .sort((a, b) => Math.abs(safeGap(b.gapRatio)) - Math.abs(safeGap(a.gapRatio)))


  function handleSave(data: { ticker: string; name: string; targetPrice: number; currentPrice: number }) {
    upsert(data)
    setModal(null)
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`"${name}" 항목을 삭제하시겠습니까?`)) {
      remove(id)
    }
  }

  return (
    <div>
      <PageHeader
        title="괴리율 모니터링"
        description="목표주가 대비 현재가 괴리율을 모니터링합니다."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {isAdmin && <Button onClick={() => setModal('add')}>+ 종목 등록</Button>}
        <Button variant="secondary" onClick={handleRefreshPrices} disabled={refreshing}>
          {refreshing ? '조회 중...' : '현재가 새로고침'}
        </Button>
        <select
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-ink"
          value={analystFilter}
          onChange={(e) => setAnalystFilter(e.target.value)}
        >
          <option value="">전체 애널리스트 ({items.length})</option>
          {analysts.map((a) => (
            <option key={a} value={a}>
              {a} ({items.filter((g) => (tickerAnalystMap.get(g.ticker) || '미지정') === a).length})
            </option>
          ))}
        </select>
        <div className="flex items-center rounded-lg border border-neutral-200 bg-white text-sm">
          {[15, 30, 60].map((n) => (
            <button
              key={n}
              onClick={() => { setPageSize(n); setPage(1) }}
              className={`px-3 py-2 transition-colors ${pageSize === n ? 'bg-brand-500 text-white font-semibold' : 'text-neutral-600 hover:bg-neutral-100'} ${n === 15 ? 'rounded-l-lg' : ''} ${n === 60 ? 'rounded-r-lg' : 'border-r border-neutral-200'}`}
            >
              {n}건
            </button>
          ))}
        </div>
      </div>

      {/* Pill 탭 + 통합 테이블 */}
      {(() => {
        const dangerItems = rows.filter((g) => Math.abs(safeGap(g.gapRatio)) >= 100)
        const warnItems = rows.filter((g) => { const a = Math.abs(safeGap(g.gapRatio)); return a >= 50 && a < 100 })
        const cautionItems = rows.filter((g) => { const a = Math.abs(safeGap(g.gapRatio)); return a >= 30 && a < 50 })
        const pillItems = activePill === 'all' ? rows : activePill === 'red' ? dangerItems : activePill === 'orange' ? warnItems : activePill === 'amber' ? cautionItems : []

        const pillTotalPages = Math.max(1, Math.ceil(pillItems.length / pageSize))
        const pillSafePage = Math.min(page, pillTotalPages)
        const pillPagedRows = pillItems.slice((pillSafePage - 1) * pageSize, pillSafePage * pageSize)

        const pills: { key: typeof activePill; label: string; count: number; base: string; active: string }[] = [
          { key: 'all', label: '전체 종목', count: rows.length, base: 'text-neutral-600 hover:bg-neutral-100', active: 'bg-ink text-white shadow-md' },
          { key: 'red', label: '위험', count: dangerItems.length, base: 'text-red-600 hover:bg-red-50', active: 'bg-red-500 text-white shadow-md' },
          { key: 'orange', label: '경고', count: warnItems.length, base: 'text-orange-600 hover:bg-orange-50', active: 'bg-orange-500 text-white shadow-md' },
          { key: 'amber', label: '주의', count: cautionItems.length, base: 'text-amber-600 hover:bg-amber-50', active: 'bg-amber-500 text-white shadow-md' },
        ]

        return (
          <>
            <div className="mb-4 inline-flex items-center gap-1 rounded-full bg-neutral-100 p-1">
              {pills.map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => { setActivePill(pill.key!); setPage(1) }}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    activePill === pill.key ? pill.active : pill.base
                  }`}
                >
                  {pill.label}
                  <span className={`ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs font-bold ${
                    activePill === pill.key ? 'bg-white/25 text-white' : 'bg-white text-neutral-600'
                  }`}>
                    {pill.count}
                  </span>
                </button>
              ))}
            </div>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-150 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-ink">
                  {pillItems.length}건
                  {pillItems.length > 0 && <span className="ml-1 font-normal text-neutral-500">({(pillSafePage - 1) * pageSize + 1}–{Math.min(pillSafePage * pageSize, pillItems.length)})</span>}
                </h3>
                {lastRefreshed && (
                  <span className="text-xs text-neutral-400">
                    {new Date(lastRefreshed).toLocaleString('ko-KR')} 기준
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-neutral-150 text-center text-xs text-neutral-500">
                      <th className="w-[22%] px-5 py-3 text-left font-medium">종목</th>
                      <th className="w-[16%] px-5 py-3 font-medium">담당 애널리스트</th>
                      <th className="w-[14%] px-5 py-3 font-medium">목표주가</th>
                      <th className="w-[14%] px-5 py-3 font-medium">현재가</th>
                      <th className="w-[12%] px-5 py-3 font-medium">괴리율</th>
                      <th className="w-[10%] px-5 py-3 font-medium">상태</th>
                      {isAdmin && <th className="w-[12%] px-5 py-3 font-medium">관리</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-150">
                    {pillPagedRows.map((g) => {
                      const gap = safeGap(g.gapRatio)
                      const tone = gapTone(gap)
                      return (
                        <tr key={g.id} className="transition-colors hover:bg-neutral-100">
                          <td className="px-5 py-3 text-left">
                            <p className="font-medium text-ink">{g.name || '(이름 없음)'}</p>
                            <p className="text-xs text-neutral-400">{g.ticker || '-'}</p>
                          </td>
                          <td className="px-5 py-3 text-center text-neutral-600">{tickerAnalystMap.get(g.ticker) || '미지정'}</td>
                          <td className="px-5 py-3 text-center tabular-nums text-neutral-600">{formatWon(g.targetPrice ?? 0)}</td>
                          <td className="px-5 py-3 text-center tabular-nums text-neutral-600">{formatWon(g.currentPrice ?? 0)}</td>
                          <td className={`px-5 py-3 text-center font-bold tabular-nums ${tone === 'red' ? 'text-red-600' : tone === 'orange' ? 'text-orange-600' : tone === 'amber' ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {formatPct(gap)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {tone === 'red' ? (
                              <Badge tone="red">위험</Badge>
                            ) : tone === 'orange' ? (
                              <Badge tone="orange">경고</Badge>
                            ) : tone === 'amber' ? (
                              <Badge tone="amber">주의</Badge>
                            ) : (
                              <Badge tone="green">정상</Badge>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-5 py-3 text-center">
                              <div className="flex justify-center gap-2">
                                <button className="text-xs text-brand-500 hover:underline" onClick={() => setModal(g)}>수정</button>
                                <button className="text-xs text-danger-600 hover:underline" onClick={() => handleDelete(g.id, g.name)}>삭제</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                    {pillItems.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="px-5 py-8 text-center text-sm text-neutral-400">
                          해당 항목이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {pillTotalPages > 1 && (
                <div className="flex items-center justify-center gap-1 border-t border-neutral-150 px-5 py-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pillSafePage <= 1}
                    className="rounded px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                  >
                    이전
                  </button>
                  {Array.from({ length: pillTotalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${p === pillSafePage ? 'bg-brand-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(pillTotalPages, p + 1))}
                    disabled={pillSafePage >= pillTotalPages}
                    className="rounded px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                  >
                    다음
                  </button>
                </div>
              )}
            </Card>
          </>
        )
      })()}

      {modal && (
        <GapRatioModal
          initial={typeof modal === 'object' ? modal : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
