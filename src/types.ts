// 도메인 타입 정의 (Phase 1)

export type Role = 'admin' | 'analyst'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface CoverageItem {
  id: string
  ticker: string
  name: string
  analyst: string
  lastUpdated: string // ISO date
  nextDue: string // ISO date (마지막 업데이트 + 6개월)
}

export interface GapRatioItem {
  id: string
  ticker: string
  name: string
  targetPrice: number
  currentPrice: number
  gapRatio: number // (목표주가 - 현재가) / 현재가 * 100
  updatedAt: string
}

export type TaskFrequency = 'daily' | 'weekly' | 'once'
export type TaskStatus = 'todo' | 'doing' | 'done'

export interface DailyTask {
  id: string
  title: string
  owner: string
  frequency: TaskFrequency
  due: string // ISO date
  status: TaskStatus
  createdBy: string
  createdAt: string
}
