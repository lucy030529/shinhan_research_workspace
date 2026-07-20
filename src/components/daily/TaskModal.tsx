import { useState } from 'react'
import { Button } from '../ui'
import type { DailyTask, TaskFrequency } from '../../types'

interface Props {
  initial?: DailyTask | null
  createdBy: string
  onSave: (data: { title: string; owner: string; frequency: TaskFrequency; due: string }) => void
  onClose: () => void
}

const FREQ_OPTIONS: { value: TaskFrequency; label: string }[] = [
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'once', label: '단발' },
]

export default function TaskModal({ initial, onSave, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [owner, setOwner] = useState(initial?.owner ?? '')
  const [frequency, setFrequency] = useState<TaskFrequency>(initial?.frequency ?? 'daily')
  const [due, setDue] = useState(initial?.due ?? new Date().toISOString().slice(0, 10))

  const valid = title.trim() && owner.trim() && due

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-ink">
          {initial ? '업무 수정' : '업무 등록'}
        </h2>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-ink-faint">업무명</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="업무 내용을 입력하세요"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-ink-faint">담당자</span>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="김민지"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-ink-faint">주기</span>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as TaskFrequency)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {FREQ_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-ink-faint">마감일</span>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button
            disabled={!valid}
            onClick={() => onSave({ title: title.trim(), owner: owner.trim(), frequency, due })}
          >
            {initial ? '수정' : '등록'}
          </Button>
        </div>
      </div>
    </div>
  )
}
