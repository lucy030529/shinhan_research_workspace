import type { ReactNode } from 'react'

// 사이드바 네비게이션 정의 + 인라인 아이콘 (외부 아이콘 라이브러리 의존 없음)

function Icon({ path }: { path: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  )
}

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '대시보드', icon: <Icon path={<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>} /> },
  { to: '/coverage', label: '커버리지 관리', icon: <Icon path={<><path d="M4 4h16v16H4z" /><path d="M4 9h16M9 4v16" /></>} /> },
  { to: '/gap-ratio', label: '괴리율 모니터링', icon: <Icon path={<><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></>} /> },
  { to: '/daily', label: '데일리 에이전트', icon: <Icon path={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>} /> },
  { to: '/reports', label: '보고서 작성', icon: <Icon path={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>} /> },
  { to: '/archive', label: '자료실 · 수집', icon: <Icon path={<><path d="M21 8v13H3V8" /><path d="M1 3h22v5H1zM10 12h4" /></>} /> },
  { to: '/worklog', label: '업무일지 · 워크로드', icon: <Icon path={<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>} /> },
  { to: '/typo', label: '오타 검수', icon: <Icon path={<><path d="M4 7V4h16v3M9 20h6M12 4v16" /></>} /> },
]
