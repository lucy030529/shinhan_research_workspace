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
        targetPrice: parseInt(String(data.researchContent?.goalPrice || '0').replace(/,/g, ''), 10) || 0,
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

    // 기본 리스트 매핑
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

    // 종목 코드가 있는 리포트만 상세 조회하여 목표주가 가져오기 (병렬, 5개씩)
    const withTicker = items.filter((r) => r.ticker)
    const BATCH = 5
    for (let i = 0; i < withTicker.length; i += BATCH) {
      const batch = withTicker.slice(i, i + BATCH)
      const details = await Promise.allSettled(
        batch.map(async (r) => {
          try {
            const resp = await fetch(
              `https://m.stock.naver.com/api/research/company/${r.id}`,
              { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
            )
            if (!resp.ok) return null
            const data = await resp.json()
            return {
              id: r.id,
              targetPrice: parseInt(String(data.researchContent?.goalPrice || '0').replace(/,/g, ''), 10) || 0,
              opinion: data.researchContent?.opinion || '',
              pdfUrl: data.researchContent?.attachUrl || r.pdfUrl,
            }
          } catch {
            return null
          }
        }),
      )
      for (const result of details) {
        if (result.status !== 'fulfilled' || !result.value) continue
        const d = result.value
        const item = items.find((r) => r.id === d.id)
        if (item) {
          item.targetPrice = d.targetPrice
          item.opinion = d.opinion
          if (d.pdfUrl) item.pdfUrl = d.pdfUrl
        }
      }
    }

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
