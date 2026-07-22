import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../store/auth'

// 회원 로그인 여부
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user)
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <>{children}</>
}
