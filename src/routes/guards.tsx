import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../store/auth'

// 1차: 사이트 공용 비밀번호 통과 여부
export function RequireGate({ children }: { children: ReactNode }) {
  const gatePassed = useAuth((s) => s.gatePassed)
  if (!gatePassed) return <Navigate to="/gate" replace />
  return <>{children}</>
}

// 2차: 회원 로그인 여부
export function RequireAuth({ children }: { children: ReactNode }) {
  const gatePassed = useAuth((s) => s.gatePassed)
  const user = useAuth((s) => s.user)
  const location = useLocation()

  if (!gatePassed) return <Navigate to="/gate" replace />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <>{children}</>
}
