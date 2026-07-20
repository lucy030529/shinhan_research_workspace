import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { MOCK_USERS } from '../data/mock'

// 사이트 공용 비밀번호(1차 게이트). 실제 배포 시 VITE_SITE_PASSWORD 환경변수로 주입.
const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD ?? 'shinhan'

interface AuthState {
  gatePassed: boolean
  user: User | null
  passGate: (pw: string) => boolean
  login: (email: string, pw: string) => { ok: boolean; message?: string }
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      gatePassed: false,
      user: null,
      passGate: (pw) => {
        const ok = pw === SITE_PASSWORD
        if (ok) set({ gatePassed: true })
        return ok
      },
      login: (email, pw) => {
        const found = MOCK_USERS.find((u) => u.email === email.trim().toLowerCase())
        if (!found || found.password !== pw) {
          return { ok: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' }
        }
        const { password: _pw, ...user } = found
        set({ user })
        return { ok: true }
      },
      logout: () => set({ user: null }),
    }),
    { name: 'shinhan-research-auth' },
  ),
)
