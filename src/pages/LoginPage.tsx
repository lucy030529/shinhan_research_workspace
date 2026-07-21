import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { Button } from '../components/ui'

// 2차: 회원 로그인
export default function LoginPage() {
  const login = useAuth((s) => s.login)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const res = login(email, pw)
    if (res.ok) {
      navigate('/', { replace: true })
    } else {
      setError(res.message ?? '로그인에 실패했습니다.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'linear-gradient(to right top, #00236e, #083b88, #1455a2, #226fbc, #328ad5, #5a9be1, #78adef, #94bff9, #b8cdfb, #d5dcfc, #ededfd, #ffffff)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src="/logo.svg" alt="신한투자증권 리서치" className="h-8" />
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <h1 className="text-lg font-bold text-ink">로그인</h1>
          <p className="mt-1 text-sm text-ink-soft">기업분석2부 리서치 워크스페이스</p>

          <label className="mt-6 block text-xs font-medium text-ink-soft">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            placeholder="name@shinhan.com"
            autoFocus
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />

          <label className="mt-4 block text-xs font-medium text-ink-soft">비밀번호</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value)
              setError('')
            }}
            placeholder="비밀번호"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <Button type="submit" className="mt-6 w-full">
            로그인
          </Button>

          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-ink-faint">
            <p className="font-medium text-ink-soft">데모 계정</p>
            <p className="mt-1">admin@shinhan.com / admin1234</p>
            <p>minji@shinhan.com / analyst1234</p>
          </div>
        </form>
      </div>
    </div>
  )
}
