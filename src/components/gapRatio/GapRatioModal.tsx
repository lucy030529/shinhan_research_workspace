import { useState } from 'react'
import { Button } from '../ui'
import type { GapRatioItem } from '../../types'

interface Props {
  initial?: GapRatioItem | null
  onSave: (data: { ticker: string; name: string; targetPrice: number; currentPrice: number }) => void
  onClose: () => void
}

export default function GapRatioModal({ initial, onSave, onClose }: Props) {
  const [ticker, setTicker] = useState(initial?.ticker ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [targetPrice, setTargetPrice] = useState(initial?.targetPrice?.toString() ?? '')
  const [currentPrice, setCurrentPrice] = useState(initial?.currentPrice?.toString() ?? '')

  const tp = Number(targetPrice)
  const cp = Number(currentPrice)
  const valid = ticker.trim() && name.trim() && tp > 0 && cp > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink">
          {initial ? '괴리율 항목 수정' : '괴리율 항목 등록'}
        </h2>

        <div className="mt-5 space-y-4">
          <Field label="종목코드" value={ticker} onChange={setTicker} placeholder="005930" />
          <Field label="종목명" value={name} onChange={setName} placeholder="삼성전자" />
          <Field label="목표주가" value={targetPrice} onChange={setTargetPrice} placeholder="95000" type="number" />
          <Field label="현재가" value={currentPrice} onChange={setCurrentPrice} placeholder="78500" type="number" />
        </div>

        {valid && (
          <p className="mt-3 text-sm text-ink-soft">
            괴리율: {((tp - cp) / cp * 100).toFixed(1)}%
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button
            disabled={!valid}
            onClick={() => onSave({ ticker: ticker.trim(), name: name.trim(), targetPrice: tp, currentPrice: cp })}
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
      <span className="text-xs font-medium text-ink-faint">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </label>
  )
}
