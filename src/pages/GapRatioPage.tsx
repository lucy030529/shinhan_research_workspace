import { Badge, Card, PageHeader } from '../components/ui'
import { MOCK_GAP_RATIO } from '../data/mock'
import { formatPct, formatWon, gapTone, GAP_WARNING_THRESHOLD } from '../lib/utils'

export default function GapRatioPage() {
  const rows = [...MOCK_GAP_RATIO].sort((a, b) => Math.abs(b.gapRatio) - Math.abs(a.gapRatio))

  return (
    <div>
      <PageHeader
        title="괴리율 모니터링"
        description={`목표주가 대비 현재가 괴리율. |괴리율| ≥ ${GAP_WARNING_THRESHOLD}% 경고. (실데이터는 신한 API·네이버증권 어댑터로 Phase 2 연동)`}
      />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((g) => {
                const tone = gapTone(g.gapRatio)
                return (
                  <tr key={g.id} className="hover:bg-slate-50">
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
                        <Badge tone="red">⚠ 경고</Badge>
                      ) : tone === 'amber' ? (
                        <Badge tone="amber">주의</Badge>
                      ) : (
                        <Badge tone="green">정상</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
