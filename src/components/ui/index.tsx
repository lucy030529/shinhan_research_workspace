import type { ReactNode } from 'react'

// Strapi-inspired UI primitives

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-lg border border-neutral-200 bg-white shadow-card ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-150 px-5 py-3.5">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {action}
    </div>
  )
}

type Tone = 'brand' | 'green' | 'amber' | 'orange' | 'red' | 'slate'

const toneMap: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700',
  green: 'bg-success-100 text-success-700',
  amber: 'bg-warning-100 text-warning-700',
  orange: 'bg-orange-50 text-orange-700',
  red: 'bg-danger-100 text-danger-700',
  slate: 'bg-neutral-100 text-neutral-600',
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${toneMap[tone]}`}
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
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-500',
    secondary: 'bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-100 disabled:opacity-50',
    ghost: 'text-neutral-600 hover:bg-neutral-100',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 disabled:opacity-50',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${variants[variant]} ${className}`}
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
    brand: 'text-brand-500',
    green: 'text-success-600',
    amber: 'text-warning-600',
    orange: 'text-orange-600',
    red: 'text-danger-600',
    slate: 'text-ink',
  }
  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-neutral-600">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${accent[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </Card>
  )
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      {description && <p className="mt-1 text-sm text-neutral-600">{description}</p>}
    </div>
  )
}

// 아직 미구현 모듈용 안내 카드
export function ComingSoon({ phase, items }: { phase: string; items: string[] }) {
  return (
    <Card className="p-8">
      <Badge tone="amber">{phase}에서 구현 예정</Badge>
      <p className="mt-4 text-sm text-neutral-600">이 모듈은 다음 기능을 포함합니다:</p>
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
