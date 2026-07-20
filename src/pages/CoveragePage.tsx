import { Badge, Card, PageHeader } from '../components/ui'
import { MOCK_COVERAGE } from '../data/mock'
import { daysUntil, dueTone } from '../lib/utils'

export default function CoveragePage() {
  const rows = [...MOCK_COVERAGE]
    .map((c) => ({ ...c, days: daysUntil(c.nextDue) }))
    .sort((a, b) => a.days - b.days)

  return (
    <div>
      <PageHeader
        title="커버리지 관리"
        description="담당 종목의 6개월 업데이트 주기를 관리합니다. (Phase 2에서 엑셀 임포트 · 등록/수정 추가 예정)"
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-ink-faint">
                <th className="px-5 py-3 font-medium">종목코드</th>
                <th className="px-5 py-3 font-medium">종목명</th>
                <th className="px-5 py-3 font-medium">담당 애널리스트</th>
                <th className="px-5 py-3 font-medium">최근 업데이트</th>
                <th className="px-5 py-3 font-medium">다음 기한</th>
                <th className="px-5 py-3 font-medium">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 tabular-nums text-ink-soft">{c.ticker}</td>
                  <td className="px-5 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-5 py-3 text-ink-soft">{c.analyst}</td>
                  <td className="px-5 py-3 tabular-nums text-ink-soft">{c.lastUpdated}</td>
                  <td className="px-5 py-3 tabular-nums text-ink-soft">{c.nextDue}</td>
                  <td className="px-5 py-3">
                    <Badge tone={dueTone(c.days)}>
                      {c.days < 0 ? `${-c.days}일 초과` : `D-${c.days}`}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
