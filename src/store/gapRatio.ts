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
  syncTargetPrices: (reports: { ticker: string; name: string; targetPrice: number }[]) => number
  /** 엑셀 기반 목표주가 초기화 */
  loadAnalystTargetPrices: () => number
}

let seq = Date.now()

function calcGap(target: number, current: number) {
  return +((target - current) / current * 100).toFixed(1)
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
        set((s) => {
          const now = new Date().toISOString()
          const existingTickers = new Set(s.items.map((g) => g.ticker))
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
          // 새 종목 추가 (목표주가가 있는 경우만)
          const newItems: GapRatioItem[] = []
          for (const r of reports) {
            if (!r.ticker || existingTickers.has(r.ticker) || r.targetPrice <= 0) continue
            existingTickers.add(r.ticker)
            updated++
            newItems.push({
              id: 'g' + (++seq),
              ticker: r.ticker,
              name: r.name,
              targetPrice: r.targetPrice,
              currentPrice: 0,
              gapRatio: 0,
              updatedAt: now,
            })
          }
          return { items: [...updatedItems, ...newItems] }
        })
        return updated
      },

      loadAnalystTargetPrices: () => {
        const entries = analystCoverageData.coverage.filter((e) => e.targetPrice > 0)
        let count = 0
        set(() => {
          const now = new Date().toISOString()
          const items: GapRatioItem[] = entries.map((e) => {
            count++
            return {
              id: 'at' + count,
              ticker: '',
              name: e.company,
              targetPrice: e.targetPrice,
              currentPrice: 0,
              gapRatio: 0,
              updatedAt: now,
            }
          })
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
      version: 3,
      migrate: () => ({ items: [], lastRefreshed: null }),
    },
  ),
)
