// Phase 1 목업 데이터.
// 실제 연동 시 src/services/adapters/ 의 어댑터가 이 데이터를 대체합니다.
import type { CoverageItem, DailyTask, GapRatioItem, User } from '../types'

// 데모용 회원 계정 (Phase 1 클라이언트 목업).
// ⚠️ 실제 운영에서는 서버측 인증 + 해시 저장으로 교체해야 합니다.
export const MOCK_USERS: (User & { password: string })[] = [
  { id: 'u1', name: '관리자', email: 'admin@shinhan.com', role: 'admin', password: 'admin1234' },
  { id: 'u2', name: '김민지', email: 'minji@shinhan.com', role: 'analyst', password: 'analyst1234' },
]

export const MOCK_COVERAGE: CoverageItem[] = [
  { id: 'c1', ticker: '005930', name: '삼성전자', analyst: '김민지', lastUpdated: '2026-02-10', nextDue: '2026-08-10' },
  { id: 'c2', ticker: '000660', name: 'SK하이닉스', analyst: '김민지', lastUpdated: '2026-01-28', nextDue: '2026-07-28' },
  { id: 'c3', ticker: '035420', name: 'NAVER', analyst: '이서준', lastUpdated: '2026-03-05', nextDue: '2026-09-05' },
  { id: 'c4', ticker: '051910', name: 'LG화학', analyst: '박도윤', lastUpdated: '2026-01-15', nextDue: '2026-07-15' },
  { id: 'c5', ticker: '207940', name: '삼성바이오로직스', analyst: '이서준', lastUpdated: '2026-04-01', nextDue: '2026-10-01' },
  { id: 'c6', ticker: '005380', name: '현대차', analyst: '박도윤', lastUpdated: '2026-02-22', nextDue: '2026-08-22' },
]

export const MOCK_GAP_RATIO: GapRatioItem[] = [
  { id: 'g1', ticker: '005930', name: '삼성전자', targetPrice: 95000, currentPrice: 78500, gapRatio: 21.0, updatedAt: '2026-07-20T09:00:00Z' },
  { id: 'g2', ticker: '000660', name: 'SK하이닉스', targetPrice: 240000, currentPrice: 231000, gapRatio: 3.9, updatedAt: '2026-07-20T09:00:00Z' },
  { id: 'g3', ticker: '035420', name: 'NAVER', targetPrice: 210000, currentPrice: 244000, gapRatio: -13.9, updatedAt: '2026-07-20T09:00:00Z' },
  { id: 'g4', ticker: '051910', name: 'LG화학', targetPrice: 420000, currentPrice: 351000, gapRatio: 19.7, updatedAt: '2026-07-20T09:00:00Z' },
  { id: 'g5', ticker: '005380', name: '현대차', targetPrice: 285000, currentPrice: 279500, gapRatio: 2.0, updatedAt: '2026-07-20T09:00:00Z' },
]

export const MOCK_TASKS: DailyTask[] = [
  { id: 't1', title: '전일 커버리지 종목 종가/괴리율 점검', owner: '김민지', frequency: 'daily', due: '2026-07-20', status: 'doing', createdBy: '김민지', createdAt: '2026-07-01' },
  { id: 't2', title: '국민연금 주간 이슈 정리', owner: '이서준', frequency: 'weekly', due: '2026-07-21', status: 'todo', createdBy: '관리자', createdAt: '2026-07-01' },
  { id: 't3', title: 'DART 신규 공시 스캔', owner: '박도윤', frequency: 'daily', due: '2026-07-20', status: 'done', createdBy: '박도윤', createdAt: '2026-07-01' },
  { id: 't4', title: '삼성전자 2Q 실적 프리뷰 초안', owner: '김민지', frequency: 'once', due: '2026-07-24', status: 'todo', createdBy: '김민지', createdAt: '2026-07-15' },
]
