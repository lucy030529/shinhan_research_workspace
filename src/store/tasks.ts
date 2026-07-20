import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DailyTask, TaskFrequency, TaskStatus } from '../types'
import { MOCK_TASKS } from '../data/mock'

interface TaskState {
  items: DailyTask[]
  add: (data: { title: string; owner: string; frequency: TaskFrequency; due: string; createdBy: string }) => void
  update: (id: string, patch: Partial<Omit<DailyTask, 'id' | 'createdAt' | 'createdBy'>>) => void
  setStatus: (id: string, status: TaskStatus) => void
  remove: (id: string) => void
}

let seq = Date.now()

export const useTasks = create<TaskState>()(
  persist(
    (set) => ({
      items: MOCK_TASKS,

      add: (data) =>
        set((s) => ({
          items: [
            ...s.items,
            {
              ...data,
              id: 't' + (++seq),
              status: 'todo' as TaskStatus,
              createdAt: new Date().toISOString().slice(0, 10),
            },
          ],
        })),

      update: (id, patch) =>
        set((s) => ({
          items: s.items.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      setStatus: (id, status) =>
        set((s) => ({
          items: s.items.map((t) => (t.id === id ? { ...t, status } : t)),
        })),

      remove: (id) =>
        set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
    }),
    { name: 'shinhan-tasks' },
  ),
)
