import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { Button } from '../components/ui'

export default function RegisterPage() {
  const register = useAuth((s) => s.register)
  const login = useAuth((s) => s.login)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [approved, setApproved] = useState(false)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw !== pwConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    setLoading(true)
    const res = await register({ name, email, password: pw })
    setLoading(false)
    if (res.ok) {
      setSuccess(true)
    } else {
      setError(res.message ?? '회원가입에 실패했습니다.')
    }
  }

  // 가입 후 5초마다 승인 여부 폴링
  useEffect(() => {
    if (!success || approved) return

    async function checkStatus() {
      try {
        const resp = await fetch(`/api/users?action=status&email=${encodeURIComponent(email)}`)
        const data = await resp.json()
        if (data.status === 'approved') {
          setApproved(true)
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch {
        // 무시
      }
    }

    checkStatus()
    intervalRef.current = setInterval(checkStatus, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [success, approved, email])

  // 승인 후 자동 로그인
  async function handleAutoLogin() {
    setLoading(true)
    const res = await login(email, pw)
    setLoading(false)
    if (res.ok) {
      navigate('/', { replace: true })
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex justify-center">
            <img src="/shinhan-logo.png" alt="신한투자증권" className="h-8" />
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-card">
            {approved ? (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success-600">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-ink">승인 완료!</h1>
                <p className="mt-2 text-sm text-neutral-600">
                  관리자가 가입을 승인했습니다.<br />
                  이제 로그인하실 수 있습니다.
                </p>
                <button
                  onClick={handleAutoLogin}
                  disabled={loading}
                  className="mt-6 inline-block rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {loading ? '로그인 중...' : '바로 시작하기'}
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-100">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin text-warning-600" style={{ animationDuration: '3s' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-ink">가입 신청 완료</h1>
                <p className="mt-2 text-sm text-neutral-600">
                  관리자 승인을 기다리고 있습니다.<br />
                  승인되면 이 화면이 자동으로 변경됩니다.
                </p>
                <div className="mt-4 rounded bg-neutral-100 px-4 py-2.5 text-xs text-neutral-500">
                  5초마다 승인 여부를 확인하고 있습니다...
                </div>
                <Link
                  to="/login"
                  className="mt-4 inline-block text-sm text-brand-500 hover:underline"
                >
                  로그인 페이지로 돌아가기
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <img src="/shinhan-logo.png" alt="신한투자증권" className="h-8" />
        </div>
        <form onSubmit={submit} className="rounded-lg border border-neutral-200 bg-white p-8 shadow-card">
          <h1 className="text-lg font-bold text-ink">회원가입</h1>
          <p className="mt-1 text-sm text-neutral-600">리서치본부 워크스페이스</p>

          <label className="mt-6 block text-xs font-semibold text-neutral-800">이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            placeholder="홍길동"
            autoFocus
            className="mt-1 w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-ink placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          <label className="mt-4 block text-xs font-semibold text-neutral-800">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            placeholder="name@shinhan.com"
            className="mt-1 w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-ink placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          <label className="mt-4 block text-xs font-semibold text-neutral-800">비밀번호</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError('') }}
            placeholder="4자 이상"
            className="mt-1 w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-ink placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          <label className="mt-4 block text-xs font-semibold text-neutral-800">비밀번호 확인</label>
          <input
            type="password"
            value={pwConfirm}
            onChange={(e) => { setPwConfirm(e.target.value); setError('') }}
            placeholder="비밀번호 재입력"
            className="mt-1 w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-ink placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? '처리 중...' : '가입 신청'}
          </Button>

          <p className="mt-4 text-center text-sm text-neutral-500">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-semibold text-brand-500 hover:underline">로그인</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
