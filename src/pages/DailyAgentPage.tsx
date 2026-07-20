import { useState } from 'react'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { useTasks } from '../store/tasks'
import { useAuth } from '../store/auth'
import TaskModal from '../components/daily/TaskModal'
import type { DailyTask, TaskFrequency, TaskStatus } from '../types'

const freqLabel: Record<string, string> = { daily: '매일', weekly: '매주', once: '단발' }
const statusTone: Record<string, 'slate' | 'brand' | 'green'> = {
  todo: 'slate',
  doing: 'brand',
  done: 'green',
}
const statusLabel: Record<string, string> = { todo: '대기', doing: '진행중', done: '완료' }
const statusCycle: TaskStatus[] = ['todo', 'doing', 'done']

export default function DailyAgentPage() {
  const { items, add, update, setStatus, remove } = useTasks()
  const user = useAuth((s) => s.user)
  const [modal, setModal] = useState<'add' | DailyTask | null>(null)
  const [filter, setFilter] = useState<'all' | TaskStatus>('all')

  const filtered = filter === 'all' ? items : items.filter((t) => t.status === filter)
  const sorted = [...filtered].sort((a, b) => {
    const order = { todo: 0, doing: 1, done: 2 }
    return order[a.status] - order[b.status] || a.due.localeCompare(b.due)
  })

  const counts = {
    all: items.length,
    todo: items.filter((t) => t.status === 'todo').length,
    doing: items.filter((t) => t.status === 'doing').length,
    done: items.filter((t) => t.status === 'done').length,
  }

  function handleSave(data: { title: string; owner: string; frequency: TaskFrequency; due: string }) {
    if (modal && typeof modal === 'object') {
      update(modal.id, data)
    } else {
      add({ ...data, createdBy: user?.name ?? '알 수 없음' })
    }
    setModal(null)
  }

  function cycleStatus(task: DailyTask) {
    const idx = statusCycle.indexOf(task.status)
    const next = statusCycle[(idx + 1) % statusCycle.length]
    setStatus(task.id, next)
  }

  function handleDelete(id: string, title: string) {
    if (confirm(`"${title}" 업무를 삭제하시겠습니까?`)) {
      remove(id)
    }
  }

  return (
    <div>
      <PageHeader
        title="데일리 에이전트"
        description="반복 업무·스케줄을 등록하고 상태를 관리합니다."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button onClick={() => setModal('add')}>+ 업무 등록</Button>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(['all', 'todo', 'doing', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-brand-600 text-white'
                  : 'text-ink-soft hover:bg-slate-100'
              }`}
            >
              {f === 'all' ? '전체' : statusLabel[f]} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader title={`업무 목록 (${sorted.length}건)`} />
        <div className="divide-y divide-slate-100">
          {sorted.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => cycleStatus(t)}
                  title="클릭하여 상태 변경"
                  className="transition-transform hover:scale-110"
                >
                  <Badge tone={statusTone[t.status]}>{statusLabel[t.status]}</Badge>
                </button>
                <div>
                  <p className={`text-sm font-medium ${t.status === 'done' ? 'text-ink-faint line-through' : 'text-ink'}`}>
                    {t.title}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {t.owner} · {freqLabel[t.frequency]} · 마감 {t.due}
                    {t.createdBy !== t.owner && ` · 등록: ${t.createdBy}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="text-xs text-brand-600 hover:underline"
                  onClick={() => setModal(t)}
                >
                  수정
                </button>
                <button
                  className="text-xs text-red-500 hover:underline"
                  onClick={() => handleDelete(t.id, t.title)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-ink-faint">
              {filter === 'all' ? '등록된 업무가 없습니다.' : `${statusLabel[filter]} 상태 업무가 없습니다.`}
            </p>
          )}
        </div>
      </Card>

      {modal && (
        <TaskModal
          initial={typeof modal === 'object' ? modal : null}
          createdBy={user?.name ?? ''}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
