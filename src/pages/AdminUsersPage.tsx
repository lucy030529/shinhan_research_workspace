import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { useAuth, fetchRegisteredUsers, approveUser, deleteUser } from '../store/auth'
import { Navigate } from 'react-router-dom'

interface RegisteredUser {
  id: string
  name: string
  email: string
  role: string
  status: 'pending' | 'approved'
  avatar?: string
  title?: string
  department?: string
  createdAt: string
}

export default function AdminUsersPage() {
  const user = useAuth((s) => s.user)
  const [users, setUsers] = useState<RegisteredUser[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchRegisteredUsers()
      setUsers(data)
    } catch {
      showToast('회원 목록 조회 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  async function handleApprove(id: string) {
    const ok = await approveUser(id)
    if (ok) {
      showToast('승인 완료')
      refresh()
    } else {
      showToast('승인 실패')
    }
  }

  async function handleReject(id: string, name: string) {
    if (!confirm(`"${name}" 가입 신청을 거절(삭제)하시겠습니까?`)) return
    const ok = await deleteUser(id)
    if (ok) {
      showToast('거절 완료')
      refresh()
    } else {
      showToast('거절 실패')
    }
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`"${name}" 계정을 삭제하시겠습니까?`)) return
    const ok = await deleteUser(id)
    if (ok) {
      showToast('삭제 완료')
      refresh()
    } else {
      showToast('삭제 실패')
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const pending = users.filter((u) => u.status === 'pending')
  const approved = users.filter((u) => u.status === 'approved')

  return (
    <div>
      <PageHeader title="회원 관리" description="가입 신청 승인 및 회원 관리" />

      {loading ? (
        <p className="py-8 text-center text-sm text-neutral-500">로딩 중...</p>
      ) : (
        <>
          {/* 승인 대기 */}
          <Card className="mb-6">
            <CardHeader title={`승인 대기 (${pending.length}건)`} />
            <div className="divide-y divide-neutral-150">
              {pending.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-neutral-500">대기 중인 신청이 없습니다.</p>
              )}
              {pending.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    {u.avatar?.startsWith('data:') ? (
                      <img src={u.avatar} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-neutral-200" />
                    ) : (
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: u.avatar?.startsWith('#') ? u.avatar : '#f59e0b' }}
                      >
                        {u.name[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {u.name}
                        {u.title && <span className="ml-1 text-xs font-normal text-neutral-500">{u.title}</span>}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {u.email}{u.department ? ` · ${u.department}` : ''}
                      </p>
                    </div>
                    <Badge tone="amber">대기</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleApprove(u.id)}>승인</Button>
                    <button
                      onClick={() => handleReject(u.id, u.name)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-danger-600 hover:bg-danger-100"
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 승인된 회원 */}
          <Card>
            <CardHeader title={`가입 회원 (${approved.length}명)`} />
            <div className="divide-y divide-neutral-150">
              {approved.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-neutral-500">가입된 회원이 없습니다.</p>
              )}
              {approved.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    {u.avatar?.startsWith('data:') ? (
                      <img src={u.avatar} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-neutral-200" />
                    ) : (
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: u.avatar?.startsWith('#') ? u.avatar : '#3b82f6' }}
                      >
                        {u.name[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {u.name}
                        {u.title && <span className="ml-1 text-xs font-normal text-neutral-500">{u.title}</span>}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {u.email}{u.department ? ` · ${u.department}` : ''}
                      </p>
                    </div>
                    <Badge tone="green">승인됨</Badge>
                  </div>
                  <button
                    onClick={() => handleRemove(u.id, u.name)}
                    className="text-xs text-danger-600 hover:underline"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-100 px-5 py-3 text-xs text-neutral-500">
            기본 계정 (admin@shinhan.com)은 여기에 표시되지 않으며 삭제할 수 없습니다.
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
