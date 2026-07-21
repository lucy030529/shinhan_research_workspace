// 신한투자증권 리서치 리포트 (네이버 증권 API 경유)
// GET /api/shinhan-research?pageSize=30

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
  const detail = url.searchParams.get('detail') // 단일 리포트 상세 조회용

  // 단일 리포트 상세 (PDF URL + 목표주가)
  if (detail) {
    try {
      const resp = await fetch(
        `https://m.stock.naver.com/api/research/company/${detail}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
      )
      if (!resp.ok) {
        return new Response(JSON.stringify({ error: `상세 조회 실패: ${resp.status}` }), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const data = await resp.json()
      return new Response(JSON.stringify({
        pdfUrl: data.researchContent?.attachUrl || '',
        targetPrice: parseInt(String(data.researchContent?.prevGoalPrice || '0').replace(/,/g, ''), 10) || 0,
        opinion: data.researchContent?.opinion || '',
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // 리포트 목록 조회
  try {
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

    const items = shinhanReports.map((r) => ({
      id: String(r.researchId),
      title: r.title,
      analyst: '',
      category: r.category || '종목분석',
      boardName: '',
      company: r.itemName || '',
      ticker: r.itemCode || '',
      date: r.writeDate || '',
      targetPrice: 0,
      opinion: '',
      pdfUrl: r.endUrl || '',
    }))

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
