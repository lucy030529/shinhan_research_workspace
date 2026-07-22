import { useRef, useState } from 'react'
import { Button, Card, CardHeader, PageHeader } from '../components/ui'
import { useAuth } from '../store/auth'

const AVATAR_COLORS = [
  { value: '#3b82f6', label: '파랑' },
  { value: '#ef4444', label: '빨강' },
  { value: '#10b981', label: '초록' },
  { value: '#f59e0b', label: '주황' },
  { value: '#8b5cf6', label: '보라' },
  { value: '#ec4899', label: '핑크' },
  { value: '#06b6d4', label: '청록' },
  { value: '#64748b', label: '회색' },
]

export default function AccountPage() {
  const user = useAuth((s) => s.user)
  const updateProfile = useAuth((s) => s.updateProfile)
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name || '')
  const [title, setTitle] = useState(user?.title || '')
  const [department, setDepartment] = useState(user?.department || '')
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPwConfirm, setNewPwConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      showToast('이미지는 500KB 이하만 가능합니다.', 'err')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleColorSelect(color: string) {
    setAvatarPreview(color)
  }

  async function handleSaveProfile() {
    setSaving(true)
    const res = await updateProfile({ name: name.trim(), avatar: avatarPreview, title, department: department.trim() })
    setSaving(false)
    if (res.ok) {
      showToast('프로필이 저장되었습니다.')
    } else {
      showToast(res.message || '저장 실패', 'err')
    }
  }

  async function handleChangePassword() {
    if (!currentPw) {
      showToast('현재 비밀번호를 입력해주세요.', 'err')
      return
    }
    if (newPw.length < 4) {
      showToast('새 비밀번호는 4자 이상이어야 합니다.', 'err')
      return
    }
    if (newPw !== newPwConfirm) {
      showToast('새 비밀번호가 일치하지 않습니다.', 'err')
      return
    }
    setSaving(true)
    const res = await updateProfile({ currentPassword: currentPw, newPassword: newPw })
    setSaving(false)
    if (res.ok) {
      showToast('비밀번호가 변경되었습니다.')
      setCurrentPw('')
      setNewPw('')
      setNewPwConfirm('')
    } else {
      showToast(res.message || '변경 실패', 'err')
    }
  }

  const isImageAvatar = avatarPreview?.startsWith('data:')
  const isColorAvatar = avatarPreview?.startsWith('#')

  return (
    <div>
      <PageHeader title="내 계정" description="프로필 및 계정 정보를 관리합니다." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 프로필 */}
        <Card>
          <CardHeader title="프로필 정보" />
          <div className="px-5 pb-5">
            {/* 아바타 */}
            <div className="flex items-center gap-5">
              <div className="relative">
                {isImageAvatar ? (
                  <img
                    src={avatarPreview}
                    alt="프로필"
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-neutral-200"
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white ring-2 ring-neutral-200"
                    style={{ backgroundColor: isColorAvatar ? avatarPreview : '#3b82f6' }}
                  >
                    {user?.name?.[0] || '?'}
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-neutral-200 hover:bg-neutral-100"
                  title="사진 변경"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{user?.name}</p>
                <p className="text-xs text-neutral-500">{user?.email}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {user?.title || (user?.role === 'admin' ? '관리자' : '직급 미설정')}
                  {user?.department ? ` · ${user.department}` : ''}
                </p>
              </div>
            </div>

            {/* 색상 선택 */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-neutral-600">아바타 색상</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => handleColorSelect(c.value)}
                    className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                      avatarPreview === c.value ? 'ring-2 ring-offset-2 ring-brand-500' : ''
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-neutral-500">또는 위 카메라 버튼으로 사진을 업로드하세요 (500KB 이하)</p>
            </div>

            {/* 이름 변경 */}
            <div className="mt-5">
              <label className="block text-xs font-medium text-neutral-600">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* 직급 선택 */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-neutral-600">직급</label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">선택 안 함</option>
                <option value="연구위원">연구위원</option>
                <option value="수석연구원">수석연구원</option>
                <option value="선임연구원">선임연구원</option>
                <option value="연구원">연구원</option>
                <option value="인턴사원">인턴사원</option>
              </select>
            </div>

            {/* 소속 */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-neutral-600">소속</label>
              <select
                value={department.split(' > ')[0] || ''}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">선택 안 함</option>
                <option value="투자전략부">투자전략부</option>
                <option value="기업분석1부">기업분석1부</option>
                <option value="기업분석2부">기업분석2부</option>
              </select>
              {department.startsWith('기업분석1부') && (
                <select
                  value={department.includes(' > ') ? department.split(' > ')[1] : ''}
                  onChange={(e) => setDepartment(e.target.value ? `기업분석1부 > ${e.target.value}` : '기업분석1부')}
                  className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">팀 선택</option>
                  <option value="해외주식팀">해외주식팀</option>
                  <option value="IT팀">IT팀</option>
                  <option value="혁신성장팀">혁신성장팀</option>
                  <option value="금융팀">금융팀</option>
                </select>
              )}
              {department.startsWith('기업분석2부') && (
                <select
                  value={department.includes(' > ') ? department.split(' > ')[1] : ''}
                  onChange={(e) => setDepartment(e.target.value ? `기업분석2부 > ${e.target.value}` : '기업분석2부')}
                  className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">팀 선택</option>
                  <option value="소재·산업재팀">소재·산업재팀</option>
                  <option value="소비재·플랫폼팀">소비재·플랫폼팀</option>
                </select>
              )}
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="mt-5">
              {saving ? '저장 중...' : '프로필 저장'}
            </Button>
          </div>
        </Card>

        {/* 비밀번호 변경 */}
        <Card>
          <CardHeader title="비밀번호 변경" />
          <div className="space-y-4 px-5 pb-5">
            <div>
              <label className="block text-xs font-medium text-neutral-600">현재 비밀번호</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600">새 비밀번호</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="4자 이상"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600">새 비밀번호 확인</label>
              <input
                type="password"
                value={newPwConfirm}
                onChange={(e) => setNewPwConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={saving} variant="secondary">
              {saving ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </div>
        </Card>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${
          toast.type === 'ok' ? 'bg-ink' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
