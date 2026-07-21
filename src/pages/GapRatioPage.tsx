import { useState } from 'react'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { useGapRatio } from '../store/gapRatio'
import { formatPct, formatWon, gapTone, GAP_WARNING_THRESHOLD } from '../lib/utils'
import { fetchStockPrices } from '../lib/api'
import GapRatioModal from '../components/gapRatio/GapRatioModal'
import type { GapRatioItem } from '../types'

export default function GapRatioPage() {
  const { items, lastRefreshed, upsert, remove, refreshPrices } = useGapRatio()
  const [modal, setModal] = useState<'add' | GapRatioItem | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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

  const rows = [...items].sort((a, b) => Math.abs(b.gapRatio) - Math.abs(a.gapRatio))
  const warnings = rows.filter((g) => Math.abs(g.gapRatio) >= GAP_WARNING_THRESHOLD)

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
        description={`목표주가 대비 현재가 괴리율. |괴리율| >= ${GAP_WARNING_THRESHOLD}% 경고.`}
      />

      {/* Warning Banner */}
      {warnings.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <span className="text-base">&#9888;</span>
            괴리율 경고 {warnings.length}건
          </h3>
          <ul className="mt-2 space-y-1">
            {warnings.map((w) => (
              <li key={w.id} className="text-sm text-red-600">
                <span className="font-medium">{w.name}</span> ({w.ticker}) — 괴리율{' '}
                <span className="font-bold">{formatPct(w.gapRatio)}</span>
                {' '}(목표 {formatWon(w.targetPrice)} / 현재 {formatWon(w.currentPrice)})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Button onClick={() => setModal('add')}>+ 종목 등록</Button>
        <Button variant="secondary" onClick={handleRefreshPrices} disabled={refreshing}>
          {refreshing ? '조회 중...' : '현재가 새로고침'}
        </Button>
        {lastRefreshed && (
          <span className="text-xs text-ink-faint">
            마지막 갱신: {new Date(lastRefreshed).toLocaleString('ko-KR')}
          </span>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-ink-faint">
                <th className="px-5 py-3 font-medium">종목</th>
                <th className="px-5 py-3 text-right font-medium">목표주가</th>
                <th className="px-5 py-3 text-right font-medium">현재가</th>
                <th className="px-5 py-3 text-right font-medium">괴리율</th>
                <th className="px-5 py-3 font-medium">상태</th>
                <th className="px-5 py-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((g) => {
                const tone = gapTone(g.gapRatio)
                return (
                  <tr key={g.id} className={`hover:bg-slate-50 ${tone === 'red' ? 'bg-red-50/40' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{g.name}</p>
                      <p className="text-xs text-ink-faint">{g.ticker}</p>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-soft">{formatWon(g.targetPrice)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-soft">{formatWon(g.currentPrice)}</td>
                    <td className={`px-5 py-3 text-right font-semibold tabular-nums ${tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-ink'}`}>
                      {formatPct(g.gapRatio)}
                    </td>
                    <td className="px-5 py-3">
                      {tone === 'red' ? (
                        <Badge tone="red">경고</Badge>
                      ) : tone === 'amber' ? (
                        <Badge tone="amber">주의</Badge>
                      ) : (
                        <Badge tone="green">정상</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          className="text-xs text-brand-600 hover:underline"
                          onClick={() => setModal(g)}
                        >
                          수정
                        </button>
                        <button
                          className="text-xs text-red-500 hover:underline"
                          onClick={() => handleDelete(g.id, g.name)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-ink-faint">
                    등록된 항목이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
