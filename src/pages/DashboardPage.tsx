import { Badge, Card, CardHeader, PageHeader, StatTile } from '../components/ui'
import { useCoverage } from '../store/coverage'
import { useGapRatio } from '../store/gapRatio'
import { useTasks } from '../store/tasks'
import { daysUntil, dueTone, formatPct, gapTone, GAP_WARNING_THRESHOLD } from '../lib/utils'
import { useAuth } from '../store/auth'

export default function DashboardPage() {
  const user = useAuth((s) => s.user)
  const coverageItems = useCoverage((s) => s.items)
  const gapItems = useGapRatio((s) => s.items)
  const taskItems = useTasks((s) => s.items)

  const dueSoon = [...coverageItems]
    .map((c) => ({ ...c, days: daysUntil(c.nextDue) }))
    .filter((c) => c.days <= 45)
    .sort((a, b) => a.days - b.days)

  const warnings = gapItems.filter((g) => Math.abs(g.gapRatio) >= GAP_WARNING_THRESHOLD)

  const todayTasks = taskItems.filter((t) => t.status !== 'done')

  return (
    <div>
      <PageHeader
        title={`안녕하세요, ${user?.name}님`}
        description="오늘의 리서치 업무 현황을 한눈에 확인하세요."
      />

      {/* 요약 지표 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="커버리지 종목" value={coverageItems.length} hint="담당 종목 수" tone="brand" />
        <StatTile
          label="45일 내 업데이트 필요"
          value={dueSoon.length}
          hint="6개월 만기 임박"
          tone={dueSoon.length ? 'amber' : 'slate'}
        />
        <StatTile
          label="괴리율 경고"
          value={warnings.length}
          hint={`|괴리율| >= ${GAP_WARNING_THRESHOLD}%`}
          tone={warnings.length ? 'red' : 'green'}
        />
        <StatTile label="오늘 남은 업무" value={todayTasks.length} hint="진행/대기" tone="slate" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 커버리지 만기 임박 */}
        <Card className="lg:col-span-2">
          <CardHeader title="커버리지 업데이트 임박 (6개월 룰)" />
          <div className="divide-y divide-slate-100">
            {dueSoon.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-ink-faint">임박한 항목이 없습니다.</p>
            )}
            {dueSoon.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {c.name} <span className="text-ink-faint">{c.ticker}</span>
                  </p>
                  <p className="text-xs text-ink-faint">
                    담당 {c.analyst} · 기한 {c.nextDue}
                  </p>
                </div>
                <Badge tone={dueTone(c.days)}>
                  {c.days < 0 ? `${-c.days}일 초과` : `D-${c.days}`}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* 괴리율 경고 */}
        <Card>
          <CardHeader title="괴리율 경고" />
          <div className="divide-y divide-slate-100">
            {warnings.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-ink-faint">경고 없음</p>
            )}
            {warnings.map((g) => (
              <div key={g.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{g.name}</p>
                  <p className="text-xs text-ink-faint">{g.ticker}</p>
                </div>
                <Badge tone={gapTone(g.gapRatio)}>{formatPct(g.gapRatio)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 오늘의 업무 */}
      <Card className="mt-6">
        <CardHeader title="오늘의 업무 (데일리 에이전트)" />
        <div className="divide-y divide-slate-100">
          {todayTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <Badge tone={t.status === 'doing' ? 'brand' : 'slate'}>
                  {t.status === 'doing' ? '진행중' : '대기'}
                </Badge>
                <span className="text-sm text-ink">{t.title}</span>
              </div>
              <span className="text-xs text-ink-faint">
                {t.owner} · {t.due}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
