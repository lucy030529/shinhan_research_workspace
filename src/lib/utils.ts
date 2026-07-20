// 공통 유틸

export const GAP_WARNING_THRESHOLD = 15 // 괴리율 |x| >= 15% 이면 경고

export function daysUntil(iso: string): number {
  const target = new Date(iso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatWon(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}

export function formatPct(n: number): string {
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%'
}

export function gapTone(gap: number): 'red' | 'amber' | 'green' | 'slate' {
  const abs = Math.abs(gap)
  if (abs >= GAP_WARNING_THRESHOLD) return 'red'
  if (abs >= 10) return 'amber'
  return 'slate'
}

export function dueTone(days: number): 'red' | 'amber' | 'green' {
  if (days <= 7) return 'red'
  if (days <= 30) return 'amber'
  return 'green'
}
