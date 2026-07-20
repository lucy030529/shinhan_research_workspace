import { Badge, Card, CardHeader, ComingSoon, PageHeader } from '../components/ui'
import { MOCK_TASKS } from '../data/mock'

const freqLabel: Record<string, string> = { daily: '매일', weekly: '매주', once: '단발' }
const statusTone: Record<string, 'slate' | 'brand' | 'green'> = {
  todo: 'slate',
  doing: 'brand',
  done: 'green',
}
const statusLabel: Record<string, string> = { todo: '대기', doing: '진행중', done: '완료' }

export default function DailyAgentPage() {
  return (
    <div>
      <PageHeader
        title="데일리 에이전트"
        description="누구나 반복 업무·스케줄을 등록하는 게시판. (Phase 3에서 등록/수정/완료 기능 추가)"
      />

      <Card className="mb-6">
        <CardHeader title="등록된 업무" />
        <div className="divide-y divide-slate-100">
          {MOCK_TASKS.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <Badge tone={statusTone[t.status]}>{statusLabel[t.status]}</Badge>
                <div>
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  <p className="text-xs text-ink-faint">
                    {t.owner} · {freqLabel[t.frequency]} · 마감 {t.due}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ComingSoon
        phase="Phase 3"
        items={[
          '업무 등록 입력폼 (업무명 · 담당자 · 주기 · 마감)',
          '게시판형 목록 · 상태 변경(대기/진행/완료)',
          '오늘 날짜 기준 자동 노출 → 대시보드 연동',
        ]}
      />
    </div>
  )
}
