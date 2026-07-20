import { useState } from 'react'
import { Badge, Card, CardHeader, PageHeader } from '../components/ui'
import { MOCK_ARCHIVE, CATEGORY_LABELS, type ArchiveItem } from '../data/archive'

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

  const filtered = MOCK_ARCHIVE
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
    all: MOCK_ARCHIVE.length,
    dart: MOCK_ARCHIVE.filter((a) => a.category === 'dart').length,
    ir: MOCK_ARCHIVE.filter((a) => a.category === 'ir').length,
    report: MOCK_ARCHIVE.filter((a) => a.category === 'report').length,
    nps: MOCK_ARCHIVE.filter((a) => a.category === 'nps').length,
  }

  return (
    <div>
      <PageHeader
        title="자료실 · 데이터 수집"
        description="DART 공시, IR 자료, 애널리스트 리포트, 국민연금 이슈를 한곳에서 관리합니다."
      />

      {/* 탭 + 검색 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(['all', 'dart', 'ir', 'report', 'nps'] as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => setTab(c)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === c ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-slate-100'
              }`}
            >
              {c === 'all' ? '전체' : CATEGORY_LABELS[c]} ({counts[c]})
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="종목명, 종목코드, 제목 검색..."
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <Card>
        <CardHeader title={`자료 목록 (${filtered.length}건)`} />
        <div className="divide-y divide-slate-100">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <Badge tone={TONE_MAP[item.category]}>
                  {CATEGORY_LABELS[item.category]}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="text-xs text-ink-faint">
                    {item.companyName && `${item.companyName} (${item.ticker}) · `}
                    {item.source} · {item.date}
                  </p>
                </div>
              </div>
              {item.url && (
                <span className="text-xs text-ink-faint">[어댑터 연동 예정]</span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-ink-faint">
              검색 결과가 없습니다.
            </p>
          )}
        </div>
      </Card>

      <p className="mt-4 text-xs text-ink-faint">
        * 현재 목업 데이터입니다. DART OpenAPI, IR 크롤러, 국민연금공단 API 연동 시 실시간 데이터로 교체됩니다.
      </p>
    </div>
  )
}
