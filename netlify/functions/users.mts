import { getStore } from '@netlify/blobs'

interface StoredUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'analyst'
  password: string
  status: 'pending' | 'approved'
  avatar?: string
  title?: string
  department?: string
  createdAt: string
}

const STORE_NAME = 'users'
const BLOB_KEY = 'registered-users'
const ADMIN_PROFILE_KEY = 'admin-profile'

// 기본 관리자 계정
const BUILTIN_USERS: StoredUser[] = [
  { id: 'u1', name: '관리자', email: 'admin@shinhan.com', role: 'admin', password: 'admin1234', status: 'approved', createdAt: '2026-01-01T00:00:00Z' },
]

async function getUsers(): Promise<StoredUser[]> {
  const store = getStore(STORE_NAME)
  const data = await store.get(BLOB_KEY)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveUsers(users: StoredUser[]) {
  const store = getStore(STORE_NAME)
  await store.set(BLOB_KEY, JSON.stringify(users))
}

async function getAdminProfile(): Promise<Partial<StoredUser>> {
  const store = getStore(STORE_NAME)
  const data = await store.get(ADMIN_PROFILE_KEY)
  if (!data) return {}
  try { return JSON.parse(data) } catch { return {} }
}

async function saveAdminProfile(profile: Partial<StoredUser>) {
  const store = getStore(STORE_NAME)
  await store.set(ADMIN_PROFILE_KEY, JSON.stringify(profile))
}

function getAllUsers(registered: StoredUser[], adminOverride?: Partial<StoredUser>): StoredUser[] {
  const admins = BUILTIN_USERS.map((u) => adminOverride ? { ...u, ...adminOverride, id: u.id, email: u.email, role: u.role as 'admin', password: u.password, status: u.status as 'pending' | 'approved' } : u)
  return [...admins, ...registered]
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    // 회원가입
    if (req.method === 'POST' && action === 'register') {
      const { name, email, password } = await req.json()
      const emailLower = (email || '').trim().toLowerCase()

      if (!name?.trim()) return jsonResponse({ error: '이름을 입력해주세요.' }, 400)
      if (!emailLower) return jsonResponse({ error: '이메일을 입력해주세요.' }, 400)
      if (!password || password.length < 4) return jsonResponse({ error: '비밀번호는 4자 이상이어야 합니다.' }, 400)

      const registered = await getUsers()
      const all = getAllUsers(registered)
      if (all.some((u) => u.email === emailLower)) {
        return jsonResponse({ error: '이미 등록된 이메일입니다.' }, 400)
      }

      const newUser: StoredUser = {
        id: 'u' + Date.now(),
        name: name.trim(),
        email: emailLower,
        role: 'analyst',
        password,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      registered.push(newUser)
      await saveUsers(registered)
      return jsonResponse({ ok: true, message: '회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.' })
    }

    // 로그인
    if (req.method === 'POST' && action === 'login') {
      const { email, password } = await req.json()
      const emailLower = (email || '').trim().toLowerCase()

      const registered = await getUsers()
      const adminProfile = await getAdminProfile()
      const all = getAllUsers(registered, adminProfile)
      const found = all.find((u) => u.email === emailLower)

      if (!found || found.password !== password) {
        return jsonResponse({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
      }
      if (found.status === 'pending') {
        return jsonResponse({ error: '관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다.' }, 403)
      }

      const { password: _, ...user } = found
      return jsonResponse({ ok: true, user })
    }

    // 회원 목록 (관리자용)
    if (req.method === 'GET' && action === 'list') {
      const registered = await getUsers()
      const safe = registered.map(({ password: _, ...u }) => u)
      return jsonResponse({ users: safe })
    }

    // 승인
    if (req.method === 'POST' && action === 'approve') {
      const { id } = await req.json()
      const registered = await getUsers()
      const user = registered.find((u) => u.id === id)
      if (!user) return jsonResponse({ error: '사용자를 찾을 수 없습니다.' }, 404)
      user.status = 'approved'
      await saveUsers(registered)
      return jsonResponse({ ok: true })
    }

    // 승인 상태 확인 (이메일 기반)
    if (req.method === 'GET' && action === 'status') {
      const email = url.searchParams.get('email')?.trim().toLowerCase()
      if (!email) return jsonResponse({ error: '이메일이 필요합니다.' }, 400)
      const registered = await getUsers()
      const all = getAllUsers(registered)
      const found = all.find((u) => u.email === email)
      if (!found) return jsonResponse({ status: 'not_found' })
      return jsonResponse({ status: found.status })
    }

    // 프로필 업데이트 (이름, 아바타, 비밀번호)
    if (req.method === 'POST' && action === 'update-profile') {
      const { email, name, avatar, title, department, currentPassword, newPassword } = await req.json()
      const emailLower = (email || '').trim().toLowerCase()

      // 기본 계정 체크
      const builtin = BUILTIN_USERS.find((u) => u.email === emailLower)
      if (builtin) {
        const existing = await getAdminProfile()
        const updated = { ...existing }
        if (name?.trim()) updated.name = name.trim()
        if (avatar !== undefined) updated.avatar = avatar
        if (title !== undefined) updated.title = title
        if (department !== undefined) updated.department = department
        if (newPassword) {
          const currentPw = existing.password || builtin.password
          if (!currentPassword || currentPassword !== currentPw) {
            return jsonResponse({ error: '현재 비밀번호가 올바르지 않습니다.' }, 400)
          }
          updated.password = newPassword
        }
        await saveAdminProfile(updated)
        const { password: _pw, ...safeAdmin } = { ...builtin, ...updated }
        return jsonResponse({ ok: true, user: safeAdmin })
      }

      const registered = await getUsers()
      const user = registered.find((u) => u.email === emailLower)
      if (!user) return jsonResponse({ error: '사용자를 찾을 수 없습니다.' }, 404)

      if (newPassword) {
        if (!currentPassword || currentPassword !== user.password) {
          return jsonResponse({ error: '현재 비밀번호가 올바르지 않습니다.' }, 400)
        }
        if (newPassword.length < 4) {
          return jsonResponse({ error: '새 비밀번호는 4자 이상이어야 합니다.' }, 400)
        }
        user.password = newPassword
      }

      if (name?.trim()) user.name = name.trim()
      if (avatar !== undefined) user.avatar = avatar
      if (title !== undefined) user.title = title
      if (department !== undefined) user.department = department

      await saveUsers(registered)
      const { password: _, ...safeUser } = user
      return jsonResponse({ ok: true, user: safeUser })
    }

    // 전체 프로필 목록 조회 (비밀번호 제외)
    if (req.method === 'GET' && action === 'profiles') {
      const registered = await getUsers()
      const adminProfile = await getAdminProfile()
      const all = getAllUsers(registered, adminProfile)
      const profiles = all
        .filter((u) => u.status === 'approved')
        .map(({ password: _, ...u }) => u)
      return jsonResponse({ profiles })
    }

    // 삭제/거절
    if (req.method === 'POST' && action === 'delete') {
      const { id } = await req.json()
      const registered = await getUsers()
      const filtered = registered.filter((u) => u.id !== id)
      if (filtered.length === registered.length) return jsonResponse({ error: '사용자를 찾을 수 없습니다.' }, 404)
      await saveUsers(filtered)
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: 'Unknown action' }, 400)
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}

export const config = { path: '/api/users' }
