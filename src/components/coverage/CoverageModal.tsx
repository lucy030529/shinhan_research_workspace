import { useState } from 'react'
import { Button } from '../ui'
import type { CoverageItem } from '../../types'

interface Props {
  initial?: CoverageItem | null
  onSave: (data: { ticker: string; name: string; analyst: string; lastUpdated: string }) => void
  onClose: () => void
}

export default function CoverageModal({ initial, onSave, onClose }: Props) {
  const [ticker, setTicker] = useState(initial?.ticker ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [analyst, setAnalyst] = useState(initial?.analyst ?? '')
  const [lastUpdated, setLastUpdated] = useState(initial?.lastUpdated ?? new Date().toISOString().slice(0, 10))

  const valid = ticker.trim() && name.trim() && analyst.trim() && lastUpdated

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink">
          {initial ? '커버리지 수정' : '커버리지 등록'}
        </h2>

        <div className="mt-5 space-y-4">
          <Field label="종목코드" value={ticker} onChange={setTicker} placeholder="005930" />
          <Field label="종목명" value={name} onChange={setName} placeholder="삼성전자" />
          <Field label="담당 애널리스트" value={analyst} onChange={setAnalyst} placeholder="김민지" />
          <Field
            label="최근 업데이트일"
            value={lastUpdated}
            onChange={setLastUpdated}
            type="date"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={!valid}
            onClick={() => onSave({ ticker: ticker.trim(), name: name.trim(), analyst: analyst.trim(), lastUpdated })}
          >
            {initial ? '수정' : '등록'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </label>
  )
}
