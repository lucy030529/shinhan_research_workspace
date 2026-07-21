import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GapRatioItem } from '../types'
import { MOCK_GAP_RATIO } from '../data/mock'

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
}

let seq = Date.now()

function calcGap(target: number, current: number) {
  return +((target - current) / current * 100).toFixed(1)
}

export const useGapRatio = create<GapRatioState>()(
  persist(
    (set) => ({
      items: MOCK_GAP_RATIO,
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
          return {
            items: s.items.map((g) => {
              const report = reports.find((r) => r.ticker === g.ticker && r.targetPrice > 0)
              if (!report || report.targetPrice === g.targetPrice) return g
              updated++
              return {
                ...g,
                targetPrice: report.targetPrice,
                gapRatio: calcGap(report.targetPrice, g.currentPrice),
                updatedAt: now,
              }
            }),
          }
        })
        return updated
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
    { name: 'shinhan-gap-ratio' },
  ),
)
