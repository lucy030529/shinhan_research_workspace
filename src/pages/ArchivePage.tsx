import { useState, useEffect, useCallback } from 'react'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { CATEGORY_LABELS, type ArchiveItem } from '../data/archive'
import { useCoverage } from '../store/coverage'
import { fetchDart, fetchNews, fetchShinhanResearch, type DartItem, type NewsItem, type ShinhanReport } from '../lib/api'

type Category = ArchiveItem['category'] | 'all'

const TONE_MAP: Record<ArchiveItem['category'], 'red' | 'brand' | 'green' | 'amber'> = {
  dart: 'red',
  ir: 'brand',
  report: 'green',
  nps: 'amber',
}

export default function ArchivePage() {
  const [tab, setTab] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const coverageItems = useCoverage((s) => s.items)

  // 실시간 데이터
  const [dartItems, setDartItems] = useState<DartItem[]>([])
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [shinhanReports, setShinhanReports] = useState<ShinhanReport[]>([])
  const [loading, setLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState<string | null>(null)

  // DART + 뉴스 + 신한 리서치를 합쳐서 ArchiveItem 형태로 변환
  const liveItems: ArchiveItem[] = [
    ...shinhanReports.map((r) => ({
      id: `shinhan-${r.id}`,
      category: 'report' as const,
      title: r.title,
      source: `신한투자증권 · ${r.analyst}`,
      date: r.date.replace(/\./g, '-'),
      companyName: r.company || undefined,
      url: r.pdfUrl || undefined,
    })),
    ...dartItems.map((d) => ({
      id: `dart-${d.id}`,
      category: 'dart' as const,
      title: d.title,
      source: 'DART',
      date: d.date,
      ticker: d.ticker,
      companyName: d.companyName,
      url: d.url,
    })),
    ...newsItems.map((n, i) => ({
      id: `news-${i}`,
      category: 'nps' as const,
      title: n.title,
      source: n.source,
      date: new Date(n.pubDate).toISOString().slice(0, 10),
      url: n.link,
    })),
  ]

  const allItems = liveItems

  const filtered = allItems
    .filter((a) => tab === 'all' || a.category === tab)
    .filter((a) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        a.title.toLowerCase().includes(q) ||
        a.companyName?.toLowerCase().includes(q) ||
        a.ticker?.includes(q) ||
        a.source.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const counts: Record<Category, number> = {
    all: allItems.length,
    dart: allItems.filter((a) => a.category === 'dart').length,
    ir: allItems.filter((a) => a.category === 'ir').length,
    report: allItems.filter((a) => a.category === 'report').length,
    nps: allItems.filter((a) => a.category === 'nps').length,
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 커버리지 기업명을 기반으로 뉴스 검색 쿼리 생성
      const companyNames = [...new Set(coverageItems.map((c) => c.name))].slice(0, 10)
      const newsQuery = companyNames.length > 0
        ? companyNames.slice(0, 5).join(' OR ') + ' 실적'
        : '증권 실적 공시'

      const [dart, news, shinhan] = await Promise.allSettled([
        fetchDart({ count: 30 }),
        fetchNews(newsQuery, 30),
        fetchShinhanResearch({ pageSize: 30 }),
      ])
      if (dart.status === 'fulfilled') setDartItems(dart.value)
      if (news.status === 'fulfilled') {
        // 커버리지 기업 관련 뉴스 우선 필터링
        const coverageNames = new Set(coverageItems.map((c) => c.name))
        const items = news.value
        const relevant = items.filter((n: NewsItem) =>
          [...coverageNames].some((name) => n.title.includes(name) || n.description.includes(name)),
        )
        // 관련 뉴스 우선 + 나머지 뉴스
        const rest = items.filter((n: NewsItem) => !relevant.includes(n))
        setNewsItems([...relevant, ...rest])
      }
      if (shinhan.status === 'fulfilled') setShinhanReports(shinhan.value.items)
      setLastFetched(new Date().toLocaleString('ko-KR'))
    } catch {
      // 실패 시 기존 데이터 유지
    } finally {
      setLoading(false)
    }
  }, [coverageItems])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div>
      <PageHeader
        title="자료실 · 데이터 수집"
        description="DART 공시, 뉴스를 실시간으로 수집합니다."
      />

      {/* 탭 + 검색 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1">
          {(['all', 'report', 'dart', 'nps'] as Category[]).map((c) => {
            const labels: Record<string, string> = { all: '전체', report: '신한 리서치', dart: 'DART 공시', nps: '뉴스' }
            return (
              <button
                key={c}
                onClick={() => setTab(c)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === c ? 'bg-brand-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {labels[c]} ({counts[c]})
              </button>
            )
          })}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="종목명, 종목코드, 제목 검색..."
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <Button variant="secondary" onClick={loadData} disabled={loading}>
          {loading ? '조회 중...' : '새로고침'}
        </Button>
        {lastFetched && (
          <span className="text-xs text-neutral-500">마지막 조회: {lastFetched}</span>
        )}
      </div>

      <Card>
        <CardHeader title={`자료 목록 (${filtered.length}건)`} />
        <div className="divide-y divide-neutral-150">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <Badge tone={TONE_MAP[item.category]}>
                  {item.category === 'report' ? '신한 리서치' : item.category === 'nps' ? '뉴스' : CATEGORY_LABELS[item.category]}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="text-xs text-neutral-500">
                    {item.companyName && `${item.companyName} (${item.ticker}) · `}
                    {item.source} · {item.date}
                  </p>
                </div>
              </div>
              {item.url && item.url !== '#' && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-500 hover:underline"
                >
                  {item.id.startsWith('shinhan-') ? '리포트 보기' : '원문 보기'}
                </a>
              )}
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <p className="px-5 py-8 text-center text-sm text-neutral-500">
              {allItems.length === 0 ? 'API 키가 설정되지 않았거나 데이터를 불러오지 못했습니다.' : '검색 결과가 없습니다.'}
            </p>
          )}
          {loading && filtered.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-neutral-600">
              <span className="inline-block w-4 h-4 border-2 border-neutral-200 border-t-brand-600 rounded-full animate-spin" />
              데이터를 불러오는 중...
            </div>
          )}
        </div>
      </Card>

      <p className="mt-4 text-xs text-neutral-500">
        * 신한투자증권 리서치, DART OpenAPI, 네이버 뉴스 API 실시간 연동 · 커버리지 기업 기반 뉴스 우선 수집
      </p>
    </div>
  )
}
