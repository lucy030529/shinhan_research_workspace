// Phase 4 AI 초안 생성 목업.
// 실제 연동 시 LLM API(Claude 등)를 호출하는 어댑터로 교체합니다.

import type { FinancialData } from '../data/financials'

function fmt(n: number): string {
  return n.toLocaleString('ko-KR')
}

export function generateDraft(data: FinancialData): { title: string; content: string; opinion: string; targetPrice: string } {
  const latest = data.periods.length - 1
  const prev = latest - 1

  const revGrowth = ((data.incomeStatement.revenue[latest] - data.incomeStatement.revenue[prev]) / data.incomeStatement.revenue[prev] * 100).toFixed(1)
  const opGrowth = ((data.incomeStatement.operatingProfit[latest] - data.incomeStatement.operatingProfit[prev]) / data.incomeStatement.operatingProfit[prev] * 100).toFixed(1)

  const title = `${data.name} — 실적 전망 및 투자의견`

  const content = `■ 투자 포인트

${data.name}(${data.ticker})의 ${data.periods[latest]} 매출액은 ${fmt(data.incomeStatement.revenue[latest])}억원(+${revGrowth}% YoY), 영업이익은 ${fmt(data.incomeStatement.operatingProfit[latest])}억원(+${opGrowth}% YoY)으로 전망합니다.

■ 실적 전망

${data.periods[latest]} 매출액 성장은 주력 사업부의 견조한 수요와 제품 믹스 개선에 기인합니다. 영업이익률은 ${data.metrics.operatingMargin[latest]}%로 전년(${data.metrics.operatingMargin[prev]}%) 대비 개선될 것으로 예상됩니다.

EPS는 ${fmt(data.incomeStatement.eps[latest])}원으로 추정되며, 현재 주가 기준 PER ${data.metrics.per[latest]}배 수준입니다. ROE는 ${data.metrics.roe[latest]}%로 자기자본 수익성이 양호합니다.

■ 재무 건전성

${data.periods[latest]} 총자산 ${fmt(data.balanceSheet.totalAssets[latest])}억원, 자기자본 ${fmt(data.balanceSheet.totalEquity[latest])}억원으로 재무구조가 안정적입니다. PBR ${data.metrics.pbr[latest]}배 수준으로 밸류에이션 매력이 존재합니다.

■ 리스크 요인

글로벌 경기 둔화에 따른 수요 감소 가능성, 환율 변동, 원자재 가격 상승에 따른 마진 압박 등을 모니터링할 필요가 있습니다.`

  const opinion = '매수'
  const targetPrice = fmt(Math.round(data.incomeStatement.eps[latest] * data.metrics.per[prev] / 1000) * 1000)

  return { title, content, opinion, targetPrice }
}
