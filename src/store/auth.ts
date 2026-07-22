import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Title, User } from '../types'

// 사이트 공용 비밀번호(1차 게이트). 실제 배포 시 VITE_SITE_PASSWORD 환경변수로 주입.
const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD ?? 'shinhan'

interface AuthState {
  gatePassed: boolean
  user: User | null
  passGate: (pw: string) => boolean
  login: (email: string, pw: string) => Promise<{ ok: boolean; message?: string }>
  register: (data: { name: string; email: string; password: string }) => Promise<{ ok: boolean; message?: string }>
  updateProfile: (data: { name?: string; avatar?: string; title?: string; department?: string; currentPassword?: string; newPassword?: string }) => Promise<{ ok: boolean; message?: string }>
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      gatePassed: false,
      user: null,
      passGate: (pw) => {
        const ok = pw === SITE_PASSWORD
        if (ok) set({ gatePassed: true })
        return ok
      },
      login: async (email, pw) => {
        try {
          const resp = await fetch('/api/users?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pw }),
          })
          const data = await resp.json()
          if (!resp.ok) {
            return { ok: false, message: data.error || '로그인에 실패했습니다.' }
          }
          set({ user: data.user })
          return { ok: true }
        } catch {
          return { ok: false, message: '서버 연결에 실패했습니다.' }
        }
      },
      register: async (data) => {
        try {
          const resp = await fetch('/api/users?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
          const result = await resp.json()
          if (!resp.ok) {
            return { ok: false, message: result.error || '회원가입에 실패했습니다.' }
          }
          return { ok: true, message: result.message }
        } catch {
          return { ok: false, message: '서버 연결에 실패했습니다.' }
        }
      },
      updateProfile: async (data): Promise<{ ok: boolean; message?: string }> => {
        const currentUser = get().user
        if (!currentUser) return { ok: false, message: '로그인이 필요합니다.' }
        try {
          const resp: Response = await fetch('/api/users?action=update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, ...data }),
          })
          const result: { ok?: boolean; error?: string; user?: User } = await resp.json()
          if (!resp.ok) {
            return { ok: false, message: result.error || '프로필 업데이트에 실패했습니다.' }
          }
          if (result.user) {
            set({ user: result.user as User })
          } else {
            set((s) => ({
              user: s.user ? {
                ...s.user,
                ...(data.name ? { name: data.name } : {}),
                ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
                ...(data.title !== undefined ? { title: data.title as Title } : {}),
                ...(data.department !== undefined ? { department: data.department } : {}),
              } : null,
            }))
          }
          return { ok: true }
        } catch {
          return { ok: false, message: '서버 연결에 실패했습니다.' }
        }
      },
      logout: () => set({ user: null }),
    }),
    { name: 'shinhan-research-auth' },
  ),
)

// 서버 API 기반 회원 관리 함수들
export async function fetchRegisteredUsers() {
  const resp = await fetch('/api/users?action=list')
  const data = await resp.json()
  return data.users || []
}

export async function approveUser(id: string) {
  const resp = await fetch('/api/users?action=approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return resp.ok
}

export async function deleteUser(id: string) {
  const resp = await fetch('/api/users?action=delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return resp.ok
}

export async function fetchProfiles(): Promise<Record<string, { name: string; avatar?: string; title?: string; department?: string }>> {
  try {
    const resp = await fetch('/api/users?action=profiles')
    const data = await resp.json()
    const map: Record<string, { name: string; avatar?: string; title?: string; department?: string }> = {}
    for (const p of data.profiles || []) {
      map[p.name] = { name: p.name, avatar: p.avatar, title: p.title, department: p.department }
    }
    return map
  } catch {
    return {}
  }
}
