import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CoverageItem } from '../types'
import analystCoverageData from '../data/analyst-coverage.json'

interface CoverageState {
  items: CoverageItem[]
  initialized: boolean
  add: (item: Omit<CoverageItem, 'id' | 'nextDue'>) => void
  update: (id: string, patch: Partial<Omit<CoverageItem, 'id'>>) => void
  remove: (id: string) => void
  importBulk: (rows: Omit<CoverageItem, 'id' | 'nextDue'>[]) => number
  /** 리포트 발간일 기준으로 커버리지 기한 갱신 */
  syncFromReports: (reports: { ticker: string; name: string; date: string }[]) => number
  /** 엑셀 기반 애널리스트 커버리지 초기화 */
  loadAnalystCoverage: () => number
}

// 엑셀에 없지만 API에서 들어오는 종목의 담당 애널리스트 매핑 (수동 추가용)
const ANALYST_OVERRIDES: Record<string, string> = {
  '017670': '김아람',   // SK텔레콤
  '294870': '김선미',   // IPARK현대산업개발
}

// 엑셀 데이터에서 ticker→analyst 매핑을 빌드
function buildAnalystMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const e of analystCoverageData.coverage) {
    const ticker = (e as Record<string, unknown>).ticker as string
    if (ticker) map.set(ticker, e.analyst)
  }
  for (const [ticker, analyst] of Object.entries(ANALYST_OVERRIDES)) {
    map.set(ticker, analyst)
  }
  return map
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
          // 새 종목 추가 (엑셀 데이터 또는 오버라이드에 있는 종목)
          const analystMap = buildAnalystMap()
          const newItems: CoverageItem[] = []
          for (const r of reports) {
            if (!r.ticker || existingTickers.has(r.ticker)) continue
            const analyst = analystMap.get(r.ticker)
            if (!analyst) continue // 2부 소속 아니면 무시
            existingTickers.add(r.ticker)
            updated++
            newItems.push({
              id: nextId(),
              ticker: r.ticker,
              name: r.name,
              analyst,
              lastUpdated: r.date,
              nextDue: addSixMonths(r.date),
            })
          }
          return { items: [...updatedItems, ...newItems], initialized: true }
        })
        return updated
      },

      loadAnalystCoverage: () => {
        const entries = analystCoverageData.coverage
        let count = 0
        set(() => {
          const items: CoverageItem[] = entries.map((e) => {
            count++
            return {
              id: 'ac' + count,
              ticker: (e as Record<string, unknown>).ticker as string || '',
              name: e.company,
              analyst: e.analyst,
              lastUpdated: e.lastUpdated,
              nextDue: addSixMonths(e.lastUpdated),
            }
          })
          return { items, initialized: true }
        })
        return count
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
    {
      name: 'shinhan-coverage',
      version: 5,
      migrate: () => ({ items: [], initialized: false }),
    },
  ),
)
