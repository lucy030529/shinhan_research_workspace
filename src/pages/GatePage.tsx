import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { Button } from '../components/ui'

// 1차 게이트: 사이트 공용 비밀번호
export default function GatePage() {
  const passGate = useAuth((s) => s.passGate)
  const navigate = useNavigate()
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passGate(pw)) {
      navigate('/login', { replace: true })
    } else {
      setError('사이트 접근 비밀번호가 올바르지 않습니다.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <div className="rounded-xl bg-white px-4 py-3">
            <img src="/logo.svg" alt="신한투자증권 리서치" className="h-7" />
          </div>
        </div>
        <form onSubmit={submit} className="rounded-2xl bg-white p-8 shadow-pop">
          <h1 className="text-lg font-bold text-ink">보안 접근</h1>
          <p className="mt-1 text-sm text-ink-soft">
            내부 리서치 워크스페이스입니다. 접근 비밀번호를 입력하세요.
          </p>
          <input
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value)
              setError('')
            }}
            placeholder="사이트 비밀번호"
            autoFocus
            className="mt-6 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" className="mt-4 w-full">
            입장
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-brand-200">
          신한투자증권 기업분석2부 · 무단 접근 금지
        </p>
      </div>
    </div>
  )
}
