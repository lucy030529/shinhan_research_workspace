// AI 레포트 생성 어댑터.
// 현재는 목업(시스템 프롬프트 + 사용자 입력을 조합하여 샘플 출력 반환).
// 실제 운영 시 Claude API 또는 백엔드 /api/generate 엔드포인트로 교체.

import { SYSTEM_PROMPTS, USER_MSG_SUFFIXES, type ReportType } from '../data/reportPrompts'

interface GenerateInput {
  reportType: ReportType
  company: string
  quarter: string
  pubDate: string
  scriptText: string
  fileTexts: string[]
  extraNotes: string
}

function formatDateKr(dateStr: string): string {
  if (!dateStr) {
    const d = new Date()
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
  }
  const [y, m, d] = dateStr.split('-')
  return `${Number(y)}년 ${Number(m)}월 ${Number(d)}일`
}

export function buildPrompt(input: GenerateInput): { system: string; user: string } {
  const system = SYSTEM_PROMPTS[input.reportType]

  const parts: string[] = []
  if (input.reportType !== 'qa' && input.pubDate) {
    parts.push(`발간일: ${formatDateKr(input.pubDate)}`)
  }
  if (input.company) parts.push(`기업명: ${input.company}`)
  if (input.quarter) parts.push(`분기: ${input.quarter}`)
  if (input.scriptText) parts.push(`## 실적발표 스크립트\n${input.scriptText}`)
  for (const ft of input.fileTexts) parts.push(ft)
  if (input.extraNotes) parts.push(`## 추가 메모\n${input.extraNotes}`)

  const user = parts.join('\n\n') + '\n\n' + USER_MSG_SUFFIXES[input.reportType]

  return { system, user }
}

// 목업 생성 함수 — 실제 API 연동 전 테스트용
export async function generateReportMock(input: GenerateInput): Promise<string> {
  const { system, user } = buildPrompt(input)

  // 실제 연동 시 아래를 Claude API 호출로 교체
  // const response = await fetch('/api/generate', { method: 'POST', body: formData })

  const mockOutputs: Record<ReportType, string> = {
    qa: `주요 Q&A

Q. ${input.quarter || '분기'} 실적 및 컨센서스 대비 평가?
A. ${input.company} ${input.quarter || '당분기'} 매출액은 컨센서스 대비 상회한 것으로 추정. 영업이익 역시 시장 기대치를 소폭 웃돈 것으로 판단. 수주잔고 확대 기조가 지속되고 있으며, 하반기 추가 수주 파이프라인도 견조한 상황

Q. 수주 현황 및 연간 가이던스 달성 전망?
A. 상반기 수주 실적은 연간 가이던스 대비 순항 중. 하반기 대형 프로젝트 발주 예정으로 연간 목표 달성 충분히 가능한 상황. 수주잔고는 매출액 대비 높은 수준을 유지하고 있어 향후 실적 가시성 확보

Q. 수익성 개선 요인 및 향후 마진 전망?
A. 고부가 제품 비중 확대와 원자재 가격 안정화로 OPM 개선세 지속. 환율 효과도 긍정적으로 작용. 다만 하반기 인건비 상승 압력은 모니터링 필요

Q. 투자의견 및 목표주가?
A. 투자의견 매수(BUY) 유지. 구조적 수요 확대 구간에서 실적 모멘텀과 밸류에이션 매력이 공존하는 상황. 수주잔고 기반의 실적 가시성이 핵심 투자 포인트`,

    sokbo: `## ${input.company} ${input.quarter || ''} 잠정실적 공시, 컨센서스 상회

### 매출·영업이익 모두 시장 기대치 상회
${input.company} ${input.quarter || '당분기'} 잠정 매출액 컨센서스 대비 소폭 상회. 영업이익 역시 시장 기대치를 웃돈 것으로 추정. 고부가 제품 믹스 개선과 원가 효율화가 동시에 작용한 결과

### 수주잔고 확대 기조 지속, 구조적 성장 국면
수주잔고는 전분기 대비 증가세 유지. 글로벌 수요 확대에 따른 파이프라인 확충이 실적 가시성을 높이는 핵심 요인. 하반기 대형 프로젝트 발주 기대감도 유효한 상황

### 투자의견 매수 유지, 실적 모멘텀 강화 구간
현 주가 수준에서 밸류에이션 매력 충분. 구조적 업황 개선 사이클 초입으로 판단되며, 추가 주가 상승 여력 존재`,

    review: `${input.company}
${input.quarter || '분기'} 실적 리뷰 — 기대 이상의 성과, 구조적 성장 확인

투자판단 매수 (유지) / 목표주가 유지

■ 신한생각
**컨센서스 상회하는 실적, 체력 증명**
${input.quarter || '당분기'} 매출액과 영업이익 모두 시장 기대치를 상회했다. 고부가 제품 비중 확대와 원가 효율화가 동시에 작용한 결과로 판단한다.

**수주잔고 기반 실적 가시성 확보**
수주잔고는 매출액 대비 높은 수준을 유지하고 있다. 하반기 대형 프로젝트 발주 예정으로 연간 가이던스 달성에 무리가 없을 것으로 전망한다.

**밸류에이션 매력 유효**
현 주가 수준에서 PER/PBR 모두 히스토리컬 평균 대비 할인 구간에 위치한다. 실적 모멘텀 강화 구간에서 추가 리레이팅 가능성이 존재한다.

주요 Q&A

Q. 수익성 개선의 지속 가능성?
A. 고부가 제품 비중 확대 트렌드는 구조적이다. 원자재 가격 안정화와 환율 효과도 긍정적으로 작용하고 있어 하반기에도 마진 개선세가 지속될 것으로 전망한다.

Q. 수주 파이프라인 전망?
A. 하반기 대형 프로젝트 발주가 예정되어 있다. 글로벌 수요 확대에 따른 신규 수주 기회도 다수 포착되고 있어 수주잔고 확대 기조가 이어질 것으로 판단한다.`,

    overseas: `${input.company}
실적 성장 지속, 글로벌 수요 확대의 수혜

투자판단 / 목표주가(LSEG 컨센서스 기준)

■ 신한생각
**매출·이익 모두 성장, 컨센서스 상회**
${input.quarter || '당분기'} 매출과 영업이익 모두 전년동기대비, 전분기대비 성장했다. 컨센서스 대비로도 상회하여 실적 모멘텀이 강화되고 있다.

**가이던스 상향 가능성 열려**
회사 측은 연간 가이던스를 유지하고 있으나, 상반기 실적 추이를 감안하면 하반기 상향 조정 가능성이 열려 있다.

**글로벌 수요 확대 수혜 지속**
글로벌 국방예산 증가, 에너지 인프라 투자 확대 등 구조적 수요 확대 국면이 지속되고 있어 중장기 성장 가시성이 높다.`,

    note: `${new Date().toISOString().slice(2, 10).replace(/-/g, '')} ${input.company} ${input.quarter || ''}실발노트

**${input.quarter || ''} 실적요약**
매출액 및 영업이익 전년동기대비 성장 추정
OPM 개선세 지속

**사업부문별 매출**
주력 부문 중심 성장세 유지
고부가 제품 비중 확대로 믹스 개선

**수주 및 수주잔고**
수주잔고 전분기 대비 증가
하반기 대형 프로젝트 발주 기대

**가이던스/전망**
연간 가이던스 달성 가능 재확인
하반기 추가 수주 파이프라인 견조

**Q&A**

Q) 수익성 개선 지속 가능성?
A) 고부가 제품 비중 확대 트렌드 구조적. 원자재 가격 안정화 효과 긍정적. 하반기에도 마진 개선세 지속 전망`,
  }

  // 약간의 딜레이로 API 호출 느낌 시뮬레이션
  await new Promise((r) => setTimeout(r, 800))

  // 프롬프트 정보를 콘솔에 출력 (디버깅용)
  console.log('[generateReport] System prompt length:', system.length)
  console.log('[generateReport] User message length:', user.length)

  return mockOutputs[input.reportType]
}
