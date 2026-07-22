import { useState, useEffect, useCallback } from 'react'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { CATEGORY_LABELS, type ArchiveItem } from '../data/archive'
import { fetchDart, fetchShinhanResearch, type DartItem, type ShinhanReport } from '../lib/api'

type Category = 'all' | 'report' | 'dart'

const TONE_MAP: Record<ArchiveItem['category'], 'red' | 'brand' | 'green' | 'amber'> = {
  dart: 'red',
  ir: 'brand',
  report: 'green',
  nps: 'amber',
}

const PAGE_SIZES = [15, 30, 60] as const

export default function ArchivePage() {
  const [tab, setTab] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState<number>(30)
  const [dartItems, setDartItems] = useState<DartItem[]>([])
  const [shinhanReports, setShinhanReports] = useState<ShinhanReport[]>([])
  const [loading, setLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState<string | null>(null)

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
    .slice(0, pageSize)

  const counts = {
    all: allItems.length,
    report: allItems.filter((a) => a.category === 'report').length,
    dart: allItems.filter((a) => a.category === 'dart').length,
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dart, shinhan] = await Promise.allSettled([
        fetchDart({ count: 60 }),
        fetchShinhanResearch({ pageSize: 60 }),
      ])
      if (dart.status === 'fulfilled') setDartItems(dart.value)
      if (shinhan.status === 'fulfilled') setShinhanReports(shinhan.value.items)
      setLastFetched(new Date().toLocaleString('ko-KR'))
    } catch {
      // 실패 시 기존 데이터 유지
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div>
      <PageHeader
        title="자료실 · 데이터 수집"
        description="DART 공시, 신한 리서치 리포트를 실시간으로 수집합니다."
      />

      {/* 탭 + 검색 + 페이지사이즈 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1">
          {(['all', 'report', 'dart'] as Category[]).map((c) => {
            const labels: Record<string, string> = { all: '전체', report: '신한 리서치', dart: 'DART 공시' }
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
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
          {PAGE_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setPageSize(s)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                pageSize === s ? 'bg-brand-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {s}개
            </button>
          ))}
        </div>
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
              <div className="flex items-center gap-3 min-w-0">
                <Badge tone={TONE_MAP[item.category]}>
                  {item.category === 'report' ? '신한 리서치' : CATEGORY_LABELS[item.category]}
                </Badge>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.title}</p>
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
                  className="shrink-0 ml-3 text-xs text-brand-500 hover:underline"
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
        * 신한투자증권 리서치, DART OpenAPI 실시간 연동
      </p>
    </div>
  )
}
