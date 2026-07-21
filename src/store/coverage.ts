import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CoverageItem } from '../types'
import { MOCK_COVERAGE } from '../data/mock'

interface CoverageState {
  items: CoverageItem[]
  add: (item: Omit<CoverageItem, 'id' | 'nextDue'>) => void
  update: (id: string, patch: Partial<Omit<CoverageItem, 'id'>>) => void
  remove: (id: string) => void
  importBulk: (rows: Omit<CoverageItem, 'id' | 'nextDue'>[]) => number
  /** 리포트 발간일 기준으로 커버리지 기한 갱신 */
  syncFromReports: (reports: { ticker: string; date: string }[]) => number
}

let seq = Date.now()
function nextId() {
  return 'c' + (++seq)
}

function addSixMonths(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + 6)
  return d.toISOString().slice(0, 10)
}

export const useCoverage = create<CoverageState>()(
  persist(
    (set, get) => ({
      items: MOCK_COVERAGE,

      add: (item) =>
        set((s) => ({
          items: [
            ...s.items,
            { ...item, id: nextId(), nextDue: addSixMonths(item.lastUpdated) },
          ],
        })),

      update: (id, patch) =>
        set((s) => ({
          items: s.items.map((c) => {
            if (c.id !== id) return c
            const merged = { ...c, ...patch }
            if (patch.lastUpdated) merged.nextDue = addSixMonths(merged.lastUpdated)
            return merged
          }),
        })),

      remove: (id) =>
        set((s) => ({ items: s.items.filter((c) => c.id !== id) })),

      syncFromReports: (reports) => {
        let updated = 0
        set((s) => ({
          items: s.items.map((c) => {
            const report = reports.find((r) => r.ticker === c.ticker)
            if (!report) return c
            // 리포트 발간일이 기존 lastUpdated보다 최신이면 갱신
            if (report.date > c.lastUpdated) {
              updated++
              return {
                ...c,
                lastUpdated: report.date,
                nextDue: addSixMonths(report.date),
              }
            }
            return c
          }),
        }))
        return updated
      },

      importBulk: (rows) => {
        const existing = get().items
        let added = 0
        const newItems: CoverageItem[] = []
        for (const row of rows) {
          const dup = existing.find(
            (e) => e.ticker === row.ticker && e.analyst === row.analyst,
          )
          if (!dup) {
            newItems.push({
              ...row,
              id: nextId(),
              nextDue: addSixMonths(row.lastUpdated),
            })
            added++
          }
        }
        if (newItems.length) set((s) => ({ items: [...s.items, ...newItems] }))
        return added
      },
    }),
    { name: 'shinhan-coverage' },
  ),
)
