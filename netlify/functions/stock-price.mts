// 네이버 증권에서 실시간 주가 조회
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
    const results: { ticker: string; currentPrice: number; change: number; changePercent: number; volume: number; name: string }[] = []

    // 네이버 증권 API (비공식) - 한 번에 여러 종목 조회
    for (const code of codes) {
      try {
        const resp = await fetch(
          `https://finance.naver.com/item/sise_day.naver?code=${code}`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } },
        )
        // 대신 JSON API 사용
        const apiResp = await fetch(
          `https://m.stock.naver.com/api/stock/${code}/basic`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } },
        )

        if (!apiResp.ok) {
          continue
        }

        const data = await apiResp.json()
        const price = data.stockEndPrice || data.closePrice
        const change = data.compareToPreviousClosePrice || 0
        const changePercent = data.fluctuationsRatio || 0

        results.push({
          ticker: code,
          name: data.stockName || code,
          currentPrice: parseInt(String(price).replace(/,/g, ''), 10) || 0,
          change: parseInt(String(change).replace(/,/g, ''), 10) || 0,
          changePercent: parseFloat(changePercent) || 0,
          volume: parseInt(String(data.accumulatedTradingVolume || '0').replace(/,/g, ''), 10) || 0,
        })
      } catch {
        // 개별 종목 실패 시 스킵
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
