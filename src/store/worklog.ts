import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WorklogEntry {
  id: string
  author: string
  date: string
  content: string
  createdAt: string
}

interface WorklogState {
  entries: WorklogEntry[]
  add: (data: { author: string; date: string; content: string }) => void
  update: (id: string, patch: Partial<Pick<WorklogEntry, 'content' | 'date'>>) => void
  remove: (id: string) => void
}

let seq = Date.now()

export const useWorklog = create<WorklogState>()(
  persist(
    (set) => ({
      entries: [
        { id: 'w1', author: '김민지', date: '2026-07-21', content: '삼성전자 2Q 실적 프리뷰 초안 작성 완료. SK하이닉스 괴리율 점검.', createdAt: '2026-07-21T09:30:00' },
        { id: 'w2', author: '이서준', date: '2026-07-21', content: 'NAVER 목표주가 재산정 작업. 국민연금 주간 이슈 정리.', createdAt: '2026-07-21T10:00:00' },
        { id: 'w3', author: '박도윤', date: '2026-07-21', content: 'DART 신규 공시 스캔 완료. LG화학 현대차 커버리지 업데이트 준비.', createdAt: '2026-07-21T08:45:00' },
        { id: 'w4', author: '김민지', date: '2026-07-18', content: '전일 종가/괴리율 전체 점검. 삼성전자 IR 자료 정리.', createdAt: '2026-07-18T17:00:00' },
        { id: 'w5', author: '이서준', date: '2026-07-18', content: '삼성바이오로직스 리포트 초안 검토. NAVER 실적 데이터 수집.', createdAt: '2026-07-18T16:30:00' },
      ],

      add: (data) =>
        set((s) => ({
          entries: [
            { ...data, id: 'w' + (++seq), createdAt: new Date().toISOString() },
            ...s.entries,
          ],
        })),

      update: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      remove: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: 'shinhan-worklog' },
  ),
)
