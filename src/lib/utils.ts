// 공통 유틸

export const GAP_WARNING_THRESHOLD = 100 // 괴리율 |x| >= 100% 이면 경고

export function daysUntil(iso: string): number {
  const target = new Date(iso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatWon(n: number): string {
  if (!isFinite(n) || n === 0) return '-'
  return n.toLocaleString('ko-KR') + '원'
}

export function formatPct(n: number): string {
  if (!isFinite(n)) return '0.0%'
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%'
}

export function gapTone(gap: number): 'red' | 'orange' | 'amber' | 'green' {
  const abs = Math.abs(gap)
  if (abs >= 100) return 'red'
  if (abs >= 50) return 'orange'
  if (abs >= 30) return 'amber'
  return 'green'
}

export function dueTone(days: number): 'red' | 'amber' | 'green' {
  if (days <= 14) return 'red'
  if (days <= 30) return 'amber'
  return 'green'
}
