import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ReportDraft {
  id: string
  ticker: string
  companyName: string
  title: string
  content: string
  opinion: string
  targetPrice: string
  createdAt: string
  updatedAt: string
  attachments: { name: string; type: 'pdf' | 'file'; size: number }[]
}

interface ReportsState {
  drafts: ReportDraft[]
  add: (draft: Omit<ReportDraft, 'id' | 'createdAt' | 'updatedAt'>) => string
  update: (id: string, patch: Partial<Pick<ReportDraft, 'title' | 'content' | 'opinion' | 'targetPrice'>>) => void
  addAttachment: (id: string, attachment: ReportDraft['attachments'][0]) => void
  removeAttachment: (id: string, fileName: string) => void
  remove: (id: string) => void
}

let seq = Date.now()

export const useReports = create<ReportsState>()(
  persist(
    (set) => ({
      drafts: [],

      add: (draft) => {
        const id = 'r' + (++seq)
        const now = new Date().toISOString()
        set((s) => ({
          drafts: [{ ...draft, id, createdAt: now, updatedAt: now }, ...s.drafts],
        }))
        return id
      },

      update: (id, patch) =>
        set((s) => ({
          drafts: s.drafts.map((d) =>
            d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
          ),
        })),

      addAttachment: (id, attachment) =>
        set((s) => ({
          drafts: s.drafts.map((d) =>
            d.id === id
              ? { ...d, attachments: [...d.attachments, attachment], updatedAt: new Date().toISOString() }
              : d,
          ),
        })),

      removeAttachment: (id, fileName) =>
        set((s) => ({
          drafts: s.drafts.map((d) =>
            d.id === id
              ? { ...d, attachments: d.attachments.filter((a) => a.name !== fileName), updatedAt: new Date().toISOString() }
              : d,
          ),
        })),

      remove: (id) =>
        set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
    }),
    { name: 'shinhan-reports' },
  ),
)
