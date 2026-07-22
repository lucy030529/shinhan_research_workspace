import { useMemo, useState } from 'react'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
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
  const [pageSize, setPageSize] = useState(30)
  const [page, setPage] = useState(1)

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
  const warnings = rows.filter((g) => Math.abs(safeGap(g.gapRatio)) >= 30)

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pagedRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize)

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
        {lastRefreshed && (
          <span className="text-xs text-ink-faint">
            마지막 갱신: {new Date(lastRefreshed).toLocaleString('ko-KR')}
          </span>
        )}
      </div>

      {/* 좌: 괴리율 경고 / 우: 전체 리스트 */}
      <div className={`grid gap-6 ${warnings.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : ''}`}>
        {/* 괴리율 경고 (왼쪽) */}
        {warnings.length > 0 && (
          <div>
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-neutral-150 bg-neutral-100 px-5 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">괴리율 주의 {warnings.length}건</h3>
                  <p className="text-[10px] text-ink-faint">|괴리율| 30% 이상</p>
                </div>
              </div>
              <div className="divide-y divide-neutral-150 max-h-[600px] overflow-y-auto">
                {warnings.map((w) => {
                  const gap = safeGap(w.gapRatio)
                  const wTone = gapTone(gap)
                  const toneBg = wTone === 'red' ? 'bg-red-100 text-red-700' : wTone === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'
                  return (
                  <div key={w.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-ink">{w.name || '(이름 없음)'}</p>
                        <p className="text-[10px] text-ink-faint">{w.ticker || '-'} · {tickerAnalystMap.get(w.ticker) || '미지정'}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${toneBg}`}>
                        {formatPct(gap)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex gap-3 text-[10px] text-ink-faint">
                      <span>목표 {formatWon(w.targetPrice ?? 0)}</span>
                      <span>현재 {formatWon(w.currentPrice ?? 0)}</span>
                    </div>
                  </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}

        {/* 전체 리스트 (오른쪽) */}
        <div>
          <Card>
            <CardHeader title={`전체 리스트 (${rows.length}건 중 ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, rows.length)})`} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-150 text-left text-xs text-neutral-500">
                    <th className="px-5 py-3 font-medium">종목</th>
                    <th className="px-5 py-3 text-right font-medium">목표주가</th>
                    <th className="px-5 py-3 text-right font-medium">현재가</th>
                    <th className="px-5 py-3 text-right font-medium">괴리율</th>
                    <th className="px-5 py-3 font-medium">상태</th>
                    {isAdmin && <th className="px-5 py-3 font-medium">관리</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150">
                  {pagedRows.map((g) => {
                    const gap = safeGap(g.gapRatio)
                    const tone = gapTone(gap)
                    return (
                      <tr key={g.id} className="hover:bg-neutral-100">
                        <td className="px-5 py-3">
                          <p className="font-medium text-ink">{g.name || '(이름 없음)'}</p>
                          <p className="text-xs text-ink-faint">{g.ticker || '-'} · {tickerAnalystMap.get(g.ticker) || '미지정'}</p>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-ink-soft">{formatWon(g.targetPrice ?? 0)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-ink-soft">{formatWon(g.currentPrice ?? 0)}</td>
                        <td className={`px-5 py-3 text-right font-semibold tabular-nums ${tone === 'red' ? 'text-red-600' : tone === 'orange' ? 'text-orange-600' : tone === 'amber' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {formatPct(gap)}
                        </td>
                        <td className="px-5 py-3">
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
                          <td className="px-5 py-3">
                            <div className="flex gap-2">
                              <button className="text-xs text-brand-500 hover:underline" onClick={() => setModal(g)}>수정</button>
                              <button className="text-xs text-danger-600 hover:underline" onClick={() => handleDelete(g.id, g.name)}>삭제</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-5 py-8 text-center text-sm text-ink-faint">
                        등록된 항목이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 border-t border-neutral-150 px-5 py-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="rounded px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${p === safePage ? 'bg-brand-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="rounded px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>

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
