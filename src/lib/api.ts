// 외부 API 클라이언트 (Netlify Functions 프록시 경유)

export interface StockPrice {
  ticker: string
  name: string
  currentPrice: number
  change: number
  changePercent: number
  volume: number
}

export interface NewsItem {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
}

export interface DartItem {
  id: string
  title: string
  companyName: string
  ticker: string
  date: string
  filer: string
  url: string
}

// 네이버 증권 — 실시간 주가
export async function fetchStockPrices(tickers: string[]): Promise<StockPrice[]> {
  if (tickers.length === 0) return []
  const resp = await fetch(`/api/stock-price?tickers=${tickers.join(',')}`)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: '주가 조회 실패' }))
    throw new Error(err.error)
  }
  const data = await resp.json()
  return data.prices || []
}

// 네이버 뉴스 검색
export async function fetchNews(query: string, count = 10): Promise<NewsItem[]> {
  const resp = await fetch(`/api/news?query=${encodeURIComponent(query)}&count=${count}`)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: '뉴스 검색 실패' }))
    throw new Error(err.error)
  }
  const data = await resp.json()
  return data.items || []
}

// DART 공시 조회
export async function fetchDart(params: { stockCode?: string; count?: number; type?: string } = {}): Promise<DartItem[]> {
  const qs = new URLSearchParams()
  if (params.stockCode) qs.set('stock_code', params.stockCode)
  if (params.count) qs.set('count', String(params.count))
  if (params.type) qs.set('type', params.type)
  const resp = await fetch(`/api/dart?${qs}`)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'DART 조회 실패' }))
    throw new Error(err.error)
  }
  const data = await resp.json()
  return data.items || []
}
