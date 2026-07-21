import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CalendarEvent {
  id: string
  date: string // YYYY-MM-DD
  title: string
  color: 'blue' | 'red' | 'green' | 'amber' | 'purple'
  createdAt: string
}

interface CalendarState {
  events: CalendarEvent[]
  add: (data: Omit<CalendarEvent, 'id' | 'createdAt'>) => void
  remove: (id: string) => void
  update: (id: string, patch: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => void
}

let seq = Date.now()

export const useCalendar = create<CalendarState>()(
  persist(
    (set) => ({
      events: [],

      add: (data) =>
        set((s) => ({
          events: [
            ...s.events,
            { ...data, id: 'ev' + (++seq), createdAt: new Date().toISOString() },
          ],
        })),

      remove: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      update: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
    }),
    { name: 'shinhan-calendar' },
  ),
)
