// 네이버 증권에서 실시간 주가 조회 (병렬 배치)
// GET /api/stock-price?tickers=005930,000660,035420

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
  const tickers = url.searchParams.get('tickers')
  if (!tickers) {
    return new Response(JSON.stringify({ error: '종목코드(tickers)를 입력해주세요.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const codes = tickers.split(',').map((t) => t.trim()).filter(Boolean)

  try {
    // 20개씩 병렬 조회 (타임아웃 방지)
    const BATCH = 20
    const results: { ticker: string; currentPrice: number; change: number; changePercent: number; volume: number; name: string }[] = []

    for (let i = 0; i < codes.length; i += BATCH) {
      const batch = codes.slice(i, i + BATCH)
      const promises = batch.map(async (code) => {
        try {
          const apiResp = await fetch(
            `https://m.stock.naver.com/api/stock/${code}/basic`,
            { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
          )
          if (!apiResp.ok) return null
          const data = await apiResp.json()
          return {
            ticker: code,
            name: data.stockName || code,
            currentPrice: parseInt(String(data.closePrice || '0').replace(/,/g, ''), 10) || 0,
            change: parseInt(String(data.compareToPreviousClosePrice || '0').replace(/,/g, ''), 10) || 0,
            changePercent: parseFloat(String(data.fluctuationsRatio || '0')) || 0,
            volume: parseInt(String(data.accumulatedTradingVolume || '0').replace(/,/g, ''), 10) || 0,
          }
        } catch {
          return null
        }
      })

      const batchResults = await Promise.all(promises)
      for (const r of batchResults) {
        if (r) results.push(r)
      }
    }

    return new Response(JSON.stringify({ prices: results, fetchedAt: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: `주가 조회 실패: ${e instanceof Error ? e.message : String(e)}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/api/stock-price' }
