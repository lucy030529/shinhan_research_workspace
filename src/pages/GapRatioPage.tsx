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
      </div>

      {/* 요약 카드 */}
      {warnings.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
            <p className="text-xs text-neutral-500">전체 종목</p>
            <p className="mt-1 text-lg font-bold text-ink">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs text-red-600">위험 (100%+)</p>
            <p className="mt-1 text-lg font-bold text-red-700">{rows.filter((g) => Math.abs(safeGap(g.gapRatio)) >= 100).length}</p>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
            <p className="text-xs text-orange-600">경고 (50~100%)</p>
            <p className="mt-1 text-lg font-bold text-orange-700">{rows.filter((g) => { const a = Math.abs(safeGap(g.gapRatio)); return a >= 50 && a < 100 }).length}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-600">주의 (30~50%)</p>
            <p className="mt-1 text-lg font-bold text-amber-700">{rows.filter((g) => { const a = Math.abs(safeGap(g.gapRatio)); return a >= 30 && a < 50 }).length}</p>
          </div>
        </div>
      )}

      {/* 통합 테이블 */}
      <Card>
        <div className="flex items-center justify-between border-b border-neutral-150 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-ink">
            전체 {rows.length}건
            {rows.length > 0 && <span className="ml-1 font-normal text-neutral-500">({(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, rows.length)})</span>}
          </h3>
          {lastRefreshed && (
            <span className="text-xs text-neutral-400">
              {new Date(lastRefreshed).toLocaleString('ko-KR')} 기준
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-150 text-center text-xs text-neutral-500">
                <th className="px-5 py-3 text-left font-medium">종목</th>
                <th className="px-5 py-3 font-medium">담당</th>
                <th className="px-5 py-3 font-medium">목표주가</th>
                <th className="px-5 py-3 font-medium">현재가</th>
                <th className="px-5 py-3 font-medium">괴리율</th>
                <th className="px-5 py-3 font-medium">상태</th>
                {isAdmin && <th className="px-5 py-3 font-medium">관리</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-150">
              {pagedRows.map((g) => {
                const gap = safeGap(g.gapRatio)
                const tone = gapTone(gap)
                const rowBg = tone === 'red' ? 'bg-red-50/60' : tone === 'orange' ? 'bg-orange-50/50' : tone === 'amber' ? 'bg-amber-50/40' : ''
                return (
                  <tr key={g.id} className={`transition-colors hover:bg-neutral-100 ${rowBg}`}>
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
              {rows.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-5 py-8 text-center text-sm text-neutral-400">
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
