import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CoverageItem } from '../types'

interface CoverageState {
  items: CoverageItem[]
  initialized: boolean
  add: (item: Omit<CoverageItem, 'id' | 'nextDue'>) => void
  update: (id: string, patch: Partial<Omit<CoverageItem, 'id'>>) => void
  remove: (id: string) => void
  importBulk: (rows: Omit<CoverageItem, 'id' | 'nextDue'>[]) => number
  /** 리포트 발간일 기준으로 커버리지 기한 갱신 */
  syncFromReports: (reports: { ticker: string; name: string; date: string }[]) => number
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
      items: [],
      initialized: false,

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
        set((s) => {
          const existingTickers = new Set(s.items.map((c) => c.ticker))
          // 기존 항목 갱신
          const updatedItems = s.items.map((c) => {
            const report = reports.find((r) => r.ticker === c.ticker)
            if (!report) return c
            if (report.date > c.lastUpdated) {
              updated++
              return {
                ...c,
                name: report.name || c.name,
                lastUpdated: report.date,
                nextDue: addSixMonths(report.date),
              }
            }
            return c
          })
          // 새 종목 추가
          const newItems: CoverageItem[] = []
          for (const r of reports) {
            if (!r.ticker || existingTickers.has(r.ticker)) continue
            existingTickers.add(r.ticker)
            updated++
            newItems.push({
              id: nextId(),
              ticker: r.ticker,
              name: r.name,
              analyst: '신한투자증권',
              lastUpdated: r.date,
              nextDue: addSixMonths(r.date),
            })
          }
          return { items: [...updatedItems, ...newItems], initialized: true }
        })
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
    { name: 'shinhan-coverage', version: 2 },
  ),
)
