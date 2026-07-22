import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { Button } from '../components/ui'

// 2차: 회원 로그인
export default function LoginPage() {
  const login = useAuth((s) => s.login)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await login(email, pw)
    setLoading(false)
    if (res.ok) {
      navigate('/', { replace: true })
    } else {
      setError(res.message ?? '로그인에 실패했습니다.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <img src="/shinhan-logo.png" alt="신한투자증권" className="h-10" />
        </div>

        <form onSubmit={submit} className="rounded-lg border border-neutral-200 bg-white p-8 shadow-card">
          <h1 className="text-lg font-bold text-ink">로그인</h1>
          <p className="mt-1 text-sm text-neutral-600">리서치본부 워크스페이스</p>

          <div className="mt-5 rounded bg-brand-50 px-4 py-3">
            <p className="text-[13px] leading-relaxed text-neutral-700">
              안녕하세요!<br />
              신한투자증권 리서치본부 워크스페이스에<br />
              오신 것을 환영합니다.
            </p>
          </div>

          <label className="mt-5 block text-xs font-semibold text-neutral-800">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            placeholder="name@shinhan.com"
            autoFocus
            className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm text-ink placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          <label className="mt-4 block text-xs font-semibold text-neutral-800">비밀번호</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value)
              setError('')
            }}
            placeholder="비밀번호"
            className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm text-ink placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </Button>

          <p className="mt-4 text-center text-sm text-neutral-500">
            계정이 없으신가요?{' '}
            <Link to="/register" className="font-semibold text-brand-500 hover:underline">회원가입</Link>
          </p>

          {/* 보안 안내 */}
          <div className="mt-5 flex items-start gap-2 rounded bg-warning-100 px-3.5 py-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-warning-600">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <p className="text-[11px] leading-relaxed text-warning-700">
              보안 정책에 따라<br />
              신한투자증권 이메일(<span className="font-semibold">@shinhan.com</span>)만<br />
              가입 가능합니다.
            </p>
          </div>
        </form>

        <p className="mt-6 text-center text-[10px] text-neutral-400">
          &copy; 2026 Shinhan Securities. All rights reserved.
        </p>
      </div>
    </div>
  )
}
