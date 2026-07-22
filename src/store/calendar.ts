import { create } from 'zustand'

export interface CalendarEvent {
  id: string
  date: string // YYYY-MM-DD (시작일)
  endDate?: string // YYYY-MM-DD (종료일, 기간 일정용)
  title: string
  color: 'blue' | 'red' | 'green' | 'amber' | 'purple' | 'cyan'
  analyst?: string
  time?: string // HH:mm
  createdBy?: string
  isDepartment?: boolean // 부서 공통사항
  createdAt: string
}

interface CalendarState {
  events: CalendarEvent[]
  loaded: boolean
  fetchEvents: () => Promise<void>
  add: (data: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<void>
  remove: (id: string) => Promise<void>
  update: (id: string, patch: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => void
}

export const useCalendar = create<CalendarState>()((set) => ({
  events: [],
  loaded: false,

  fetchEvents: async () => {
    try {
      const resp = await fetch('/api/calendar')
      const data = await resp.json()
      set({ events: data.events || [], loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  add: async (data) => {
    try {
      const resp = await fetch('/api/calendar?action=add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await resp.json()
      if (result.ok && result.event) {
        set((s) => ({ events: [...s.events, result.event] }))
      }
    } catch {
      const id = 'ev' + Date.now() + Math.random().toString(36).slice(2, 6)
      set((s) => ({
        events: [...s.events, { ...data, id, createdAt: new Date().toISOString() }],
      }))
    }
  },

  remove: async (id) => {
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }))
    try {
      await fetch('/api/calendar?action=remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {
      // ignore
    }
  },

  update: (id, patch) => {
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
    fetch('/api/calendar?action=update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, patch }),
    }).catch(() => {})
  },
}))
