// Phase 5 자료실 목업 데이터.
// 실제 연동 시 DART OpenAPI, IR 크롤러 등 어댑터로 교체합니다.

export interface ArchiveItem {
  id: string
  category: 'dart' | 'ir' | 'report' | 'nps'
  title: string
  source: string
  date: string
  ticker?: string
  companyName?: string
  url?: string
}

export const MOCK_ARCHIVE: ArchiveItem[] = [
  // DART 공시
  { id: 'a1', category: 'dart', title: '분기보고서 (2026.06)', source: 'DART', date: '2026-07-15', ticker: '005930', companyName: '삼성전자', url: '#' },
  { id: 'a2', category: 'dart', title: '주요사항보고서 (자기주식 취득)', source: 'DART', date: '2026-07-12', ticker: '000660', companyName: 'SK하이닉스', url: '#' },
  { id: 'a3', category: 'dart', title: '사업보고서 (2025)', source: 'DART', date: '2026-07-10', ticker: '035420', companyName: 'NAVER', url: '#' },
  { id: 'a4', category: 'dart', title: '임원 변동 사항', source: 'DART', date: '2026-07-08', ticker: '051910', companyName: 'LG화학', url: '#' },
  { id: 'a5', category: 'dart', title: '최대주주 변경', source: 'DART', date: '2026-07-05', ticker: '005380', companyName: '현대차', url: '#' },

  // IR 자료
  { id: 'a6', category: 'ir', title: '2Q26 실적발표 IR 자료', source: 'IR', date: '2026-07-18', ticker: '005930', companyName: '삼성전자', url: '#' },
  { id: 'a7', category: 'ir', title: 'HBM4 기술 설명회 자료', source: 'IR', date: '2026-07-14', ticker: '000660', companyName: 'SK하이닉스', url: '#' },
  { id: 'a8', category: 'ir', title: 'AI 사업 전략 발표 자료', source: 'IR', date: '2026-07-11', ticker: '035420', companyName: 'NAVER', url: '#' },

  // 애널리스트 리포트
  { id: 'a9', category: 'report', title: '삼성전자 2Q 실적 프리뷰 — 메모리 업사이클 본격화', source: '신한투자증권', date: '2026-07-19', ticker: '005930', companyName: '삼성전자' },
  { id: 'a10', category: 'report', title: 'SK하이닉스 — HBM 독주 지속', source: '신한투자증권', date: '2026-07-17', ticker: '000660', companyName: 'SK하이닉스' },
  { id: 'a11', category: 'report', title: '2026 하반기 IT 섹터 전망', source: '신한투자증권', date: '2026-07-16' },

  // 국민연금 주간 이슈
  { id: 'a12', category: 'nps', title: '국민연금 주간 투자동향 (7/14~7/18)', source: '국민연금공단', date: '2026-07-19' },
  { id: 'a13', category: 'nps', title: '국민연금 주간 투자동향 (7/7~7/11)', source: '국민연금공단', date: '2026-07-12' },
  { id: 'a14', category: 'nps', title: '국민연금 주간 투자동향 (6/30~7/4)', source: '국민연금공단', date: '2026-07-05' },
]

export const CATEGORY_LABELS: Record<ArchiveItem['category'], string> = {
  dart: 'DART 공시',
  ir: 'IR 자료',
  report: '애널리스트 리포트',
  nps: '국민연금 이슈',
}
