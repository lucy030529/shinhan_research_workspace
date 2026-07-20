import type { ReactNode } from 'react'

// 공통 UI 프리미티브 (Phase 1 디자인 시스템)

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-card ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {action}
    </div>
  )
}

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'slate'

const toneMap: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  red: 'bg-red-50 text-red-700 ring-red-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${toneMap[tone]}`}
    >
      {children}
    </span>
  )
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50',
    secondary: 'bg-white text-ink ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
    ghost: 'text-ink-soft hover:bg-slate-100',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'slate',
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: Tone
}) {
  const accent: Record<Tone, string> = {
    brand: 'text-brand-700',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    slate: 'text-ink',
  }
  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-ink-faint">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${accent[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </Card>
  )
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
    </div>
  )
}

// 아직 미구현 모듈용 안내 카드
export function ComingSoon({ phase, items }: { phase: string; items: string[] }) {
  return (
    <Card className="p-8">
      <Badge tone="amber">{phase}에서 구현 예정</Badge>
      <p className="mt-4 text-sm text-ink-soft">이 모듈은 다음 기능을 포함합니다:</p>
      <ul className="mt-3 space-y-1.5 text-sm text-ink">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="text-brand-500">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
