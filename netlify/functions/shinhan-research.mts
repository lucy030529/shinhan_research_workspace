// 신한투자증권 리서치 리포트 (네이버 증권 API 경유)
// GET /api/shinhan-research?page=1&pageSize=20

interface NaverResearchItem {
  researchCategory: string
  category: string
  itemCode: string
  itemName: string
  researchId: number
  title: string
  brokerName: string
  writeDate: string
  readCount: string
  endUrl: string
}

interface NaverResearchDetail {
  researchContent: {
    attachUrl: string
    content: string
    opinion: string
    prevGoalPrice: string
    priceAtWriteDate: string
    [key: string]: string
  }
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const url = new URL(req.url)
  const pageSize = parseInt(url.searchParams.get('pageSize') || '30', 10)

  try {
    // 1. 네이버 증권 리서치 목록에서 신한투자증권 리포트 필터링
    // 충분히 많이 가져와서 신한 것만 필터
    const listResp = await fetch(
      `https://m.stock.naver.com/api/research/company?page=1&pageSize=100`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
    )

    if (!listResp.ok) {
      return new Response(JSON.stringify({ error: `네이버 리서치 API 오류: ${listResp.status}` }), {
        status: listResp.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const allReports: NaverResearchItem[] = await listResp.json()
    const shinhanReports = allReports
      .filter((r) => r.brokerName.includes('신한'))
      .slice(0, pageSize)

    // 2. 각 리포트의 상세 정보에서 PDF URL 가져오기
    const items = await Promise.all(
      shinhanReports.map(async (r) => {
        let pdfUrl = ''
        let targetPrice = 0
        let opinion = ''
        try {
          const detailResp = await fetch(
            `https://m.stock.naver.com/api/research/company/${r.researchId}`,
            { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
          )
          if (detailResp.ok) {
            const detail: NaverResearchDetail = await detailResp.json()
            pdfUrl = detail.researchContent?.attachUrl || ''
            targetPrice = parseInt(String(detail.researchContent?.prevGoalPrice || '0').replace(/,/g, ''), 10) || 0
            opinion = detail.researchContent?.opinion || ''
          }
        } catch {
          // 상세 정보 못 가져와도 목록은 표시
        }

        return {
          id: String(r.researchId),
          title: r.title,
          analyst: '',
          category: r.category || '종목분석',
          boardName: '',
          company: r.itemName || '',
          ticker: r.itemCode || '',
          date: r.writeDate || '',
          targetPrice,
          opinion,
          pdfUrl: pdfUrl || r.endUrl,
        }
      }),
    )

    return new Response(JSON.stringify({ items, total: items.length, fetchedAt: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: `신한 리서치 조회 실패: ${e instanceof Error ? e.message : String(e)}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/api/shinhan-research' }
