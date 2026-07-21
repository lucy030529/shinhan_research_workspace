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

// 신한 리서치 리포트
export interface ShinhanReport {
  id: string
  title: string
  analyst: string
  category: string
  boardName: string
  company: string
  ticker: string
  date: string
  targetPrice: number
  opinion: string
  pdfUrl: string
}

export async function fetchShinhanResearch(params: { page?: number; pageSize?: number; boardName?: string; keyword?: string } = {}): Promise<{ items: ShinhanReport[]; total: number }> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.boardName) qs.set('boardName', params.boardName)
  if (params.keyword) qs.set('keyword', params.keyword)
  const resp = await fetch(`/api/shinhan-research?${qs}`)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: '신한 리서치 조회 실패' }))
    throw new Error(err.error)
  }
  const data = await resp.json()
  return { items: data.items || [], total: data.total || 0 }
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
