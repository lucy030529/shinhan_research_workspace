import { useState, useMemo, useCallback } from 'react'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { useCoverage } from '../store/coverage'
import { fetchDart, type DartItem } from '../lib/api'

// DART IR 관련 보고서 유형 키워드
const IR_KEYWORDS = ['실적', '영업실적', '사업보고서', '분기보고서', '반기보고서', '감사보고서', '주주총회', 'IR', '투자설명서', '경영실적']

function getCompanyIRUrl(ticker: string) {
  // 네이버 금융 기업 정보 페이지 (IR 자료 포함)
  return `https://finance.naver.com/item/coinfo.naver?code=${ticker}`
}

interface IREntry {
  company: string
  ticker: string
  analyst: string
  filings: DartItem[]
}

export default function IRCollectionPage() {
  const coverageItems = useCoverage((s) => s.items)
  const [loading, setLoading] = useState(false)
  const [irData, setIrData] = useState<Map<string, DartItem[]>>(new Map())
  const [lastFetched, setLastFetched] = useState<string | null>(null)
  const [analystFilter, setAnalystFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const analysts = useMemo(() => {
    return [...new Set(coverageItems.map((c) => c.analyst))].sort()
  }, [coverageItems])

  const companies = useMemo(() => {
    return coverageItems
      .filter((c) => !analystFilter || c.analyst === analystFilter)
      .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.ticker.includes(searchQuery))
      .sort((a, b) => a.analyst.localeCompare(b.analyst) || a.name.localeCompare(b.name))
  }, [coverageItems, analystFilter, searchQuery])

  const irEntries: IREntry[] = useMemo(() => {
    return companies.map((c) => ({
      company: c.name,
      ticker: c.ticker,
      analyst: c.analyst,
      filings: irData.get(c.ticker) || [],
    }))
  }, [companies, irData])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    const newData = new Map<string, DartItem[]>()
    try {
      // 전체 DART 공시를 가져온 후 커버리지 종목 기준으로 필터링
      const allFilings = await fetchDart({ count: 100 })
      const coverageTickers = new Set(coverageItems.map((c) => c.ticker))

      for (const filing of allFilings) {
        if (!coverageTickers.has(filing.ticker)) continue
        const isIR = IR_KEYWORDS.some((kw) => filing.title.includes(kw))
        if (!isIR && !filing.title.includes('보고서')) continue

        if (!newData.has(filing.ticker)) newData.set(filing.ticker, [])
        newData.get(filing.ticker)!.push(filing)
      }

      setIrData(newData)
      setLastFetched(new Date().toLocaleString('ko-KR'))
    } catch {
      alert('IR 자료 수집 실패')
    } finally {
      setLoading(false)
    }
  }, [coverageItems])

  const totalFilings = Array.from(irData.values()).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div>
      <PageHeader
        title="IR 자료 수집"
        description="커버리지 기업의 IR 자료를 수집하고 관리합니다. 최신화 버튼을 눌러 DART 공시 기반 IR 자료를 업데이트하세요."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button onClick={handleRefresh} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              수집 중...
            </span>
          ) : '최신화'}
        </Button>
        <select
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-ink"
          value={analystFilter}
          onChange={(e) => setAnalystFilter(e.target.value)}
        >
          <option value="">전체 애널리스트 ({coverageItems.length}개 종목)</option>
          {analysts.map((a) => (
            <option key={a} value={a}>
              {a} ({coverageItems.filter((c) => c.analyst === a).length})
            </option>
          ))}
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="종목명/코드 검색..."
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {lastFetched && (
          <span className="text-xs text-neutral-500">마지막 수집: {lastFetched} · {totalFilings}건</span>
        )}
      </div>

      {/* 기업별 IR 자료 카드 */}
      <div className="space-y-4">
        {(() => {
          let currentAnalyst = ''
          const elements: React.ReactNode[] = []

          for (const entry of irEntries) {
            if (entry.analyst !== currentAnalyst) {
              currentAnalyst = entry.analyst
              elements.push(
                <div key={`analyst-${entry.analyst}`} className="flex items-center gap-2 pt-4 first:pt-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {entry.analyst[0]}
                  </div>
                  <h2 className="text-sm font-bold text-ink">{entry.analyst}</h2>
                  <span className="text-xs text-neutral-500">
                    ({coverageItems.filter((c) => c.analyst === entry.analyst).length}개 종목)
                  </span>
                </div>,
              )
            }

            elements.push(
              <Card key={entry.ticker}>
                <div className="flex items-center justify-between border-b border-neutral-150 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-ink">{entry.company}</h3>
                      <p className="text-xs text-neutral-500">{entry.ticker} · {entry.analyst}</p>
                    </div>
                    {entry.filings.length > 0 && (
                      <Badge tone="green">{entry.filings.length}건</Badge>
                    )}
                  </div>
                  <a
                    href={getCompanyIRUrl(entry.ticker)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    IR 자료실로 이동
                  </a>
                </div>
                {entry.filings.length > 0 ? (
                  <div className="divide-y divide-neutral-150">
                    {entry.filings.map((f) => (
                      <div key={f.id} className="flex items-center justify-between px-5 py-2.5">
                        <div>
                          <p className="text-sm text-ink">{f.title}</p>
                          <p className="text-[10px] text-neutral-500">{f.date} · {f.filer || 'DART'}</p>
                        </div>
                        {f.url && f.url !== '#' && (
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-600 hover:bg-slate-200"
                          >
                            PDF 보기
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-5 py-4 text-xs text-neutral-500">
                    {lastFetched ? '수집된 IR 자료가 없습니다.' : '최신화 버튼을 눌러 IR 자료를 수집하세요.'}
                  </p>
                )}
              </Card>,
            )
          }

          return elements
        })()}

        {companies.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-500">표시할 커버리지 종목이 없습니다.</p>
        )}
      </div>
    </div>
  )
}
