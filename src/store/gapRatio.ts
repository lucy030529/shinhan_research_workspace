import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GapRatioItem } from '../types'
import analystCoverageData from '../data/analyst-coverage.json'

interface GapRatioState {
  items: GapRatioItem[]
  /** 마지막 새로고침 시각 (ISO) */
  lastRefreshed: string | null
  /** 수동으로 항목 추가/수정 */
  upsert: (item: Omit<GapRatioItem, 'id' | 'gapRatio' | 'updatedAt'>) => void
  remove: (id: string) => void
  /** 현재가 일괄 갱신 (어댑터에서 가져온 데이터) */
  refreshPrices: (prices: { ticker: string; currentPrice: number }[]) => void
  /** 리포트 발간 시 목표주가 갱신 */
  syncTargetPrices: (reports: { ticker: string; name: string; targetPrice: number; analyst?: string }[]) => number
  /** 엑셀 기반 목표주가 초기화 */
  loadAnalystTargetPrices: () => number
}

let seq = Date.now()

function calcGap(target: number, current: number) {
  if (!target || !current || !isFinite(target) || !isFinite(current) || current <= 0) return 0
  const result = (target - current) / current * 100
  if (!isFinite(result)) return 0
  return +result.toFixed(1)
}

export const useGapRatio = create<GapRatioState>()(
  persist(
    (set) => ({
      items: [],
      lastRefreshed: null,

      upsert: (data) =>
        set((s) => {
          const now = new Date().toISOString()
          const existing = s.items.find((g) => g.ticker === data.ticker)
          if (existing) {
            return {
              items: s.items.map((g) =>
                g.ticker === data.ticker
                  ? {
                      ...g,
                      ...data,
                      gapRatio: calcGap(data.targetPrice, data.currentPrice),
                      updatedAt: now,
                    }
                  : g,
              ),
            }
          }
          return {
            items: [
              ...s.items,
              {
                ...data,
                id: 'g' + (++seq),
                gapRatio: calcGap(data.targetPrice, data.currentPrice),
                updatedAt: now,
              },
            ],
          }
        }),

      remove: (id) =>
        set((s) => ({ items: s.items.filter((g) => g.id !== id) })),

      syncTargetPrices: (reports) => {
        let updated = 0
        // 엑셀 기반 애널리스트 매핑 — 2부 소속 종목만 필터
        const analystMap = new Map<string, string>()
        for (const e of analystCoverageData.coverage) {
          const ticker = (e as Record<string, unknown>).ticker as string
          if (ticker) analystMap.set(ticker, e.analyst)
        }
        set((s) => {
          const now = new Date().toISOString()
          // 기존 항목 갱신
          const updatedItems = s.items.map((g) => {
            const report = reports.find((r) => r.ticker === g.ticker && r.targetPrice > 0)
            if (!report || report.targetPrice === g.targetPrice) return g
            updated++
            return {
              ...g,
              targetPrice: report.targetPrice,
              gapRatio: calcGap(report.targetPrice, g.currentPrice),
              updatedAt: now,
            }
          })
          // 새 종목 추가 — 2부 커버리지에 있거나, 리포트 애널리스트가 2부 소속이면 추가
          const analystSet = new Set(analystCoverageData.analysts)
          const existingTickers = new Set(updatedItems.map((g) => g.ticker))
          const newItems: GapRatioItem[] = []
          for (const r of reports) {
            if (!r.ticker || existingTickers.has(r.ticker) || r.targetPrice <= 0) continue
            if (!analystMap.has(r.ticker) && !(r.analyst && analystSet.has(r.analyst))) continue // 2부 소속 아니면 무시
            existingTickers.add(r.ticker)
            newItems.push({
              id: 'g' + (++seq),
              ticker: r.ticker,
              name: r.name,
              targetPrice: r.targetPrice,
              currentPrice: 0,
              gapRatio: 0,
              updatedAt: now,
            })
            updated++
          }
          return { items: [...updatedItems, ...newItems] }
        })
        return updated
      },

      loadAnalystTargetPrices: () => {
        const entries = analystCoverageData.coverage.filter((e) => e.targetPrice > 0 && (e as Record<string, unknown>).ticker)
        let count = 0
        set(() => {
          const now = new Date().toISOString()
          const seen = new Set<string>()
          const items: GapRatioItem[] = []
          for (const e of entries) {
            const ticker = (e as Record<string, unknown>).ticker as string
            if (!ticker || seen.has(ticker)) continue
            seen.add(ticker)
            count++
            items.push({
              id: 'at' + count,
              ticker,
              name: e.company,
              targetPrice: e.targetPrice,
              currentPrice: 0,
              gapRatio: 0,
              updatedAt: now,
            })
          }
          return { items }
        })
        return count
      },

      refreshPrices: (prices) =>
        set((s) => {
          const now = new Date().toISOString()
          const priceMap = new Map(prices.map((p) => [p.ticker, p.currentPrice]))
          return {
            lastRefreshed: now,
            items: s.items.map((g) => {
              const newPrice = priceMap.get(g.ticker)
              if (newPrice == null) return g
              return {
                ...g,
                currentPrice: newPrice,
                gapRatio: calcGap(g.targetPrice, newPrice),
                updatedAt: now,
              }
            }),
          }
        }),
    }),
    {
      name: 'shinhan-gap-ratio',
      version: 8,
      migrate: () => ({ items: [], lastRefreshed: null }),
    },
  ),
)
