import { useState } from 'react'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { useCoverage } from '../store/coverage'
import { useAuth } from '../store/auth'
import { daysUntil, dueTone } from '../lib/utils'
import CoverageModal from '../components/coverage/CoverageModal'
import ExcelImport from '../components/coverage/ExcelImport'
import type { CoverageItem } from '../types'

export default function CoveragePage() {
  const { items, add, update, remove, importBulk } = useCoverage()
  const user = useAuth((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const [modal, setModal] = useState<'add' | CoverageItem | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [analystFilter, setAnalystFilter] = useState<string>('')
  const [pageSize, setPageSize] = useState(15)
  const [page, setPage] = useState(1)

  const analysts = [...new Set(items.map((c) => c.analyst))].sort()

  const rows = [...items]
    .filter((c) => !analystFilter || c.analyst === analystFilter)
    .map((c) => ({ ...c, days: daysUntil(c.nextDue) }))
    .sort((a, b) => a.days - b.days)

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pagedRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize)

  function handleSave(data: { ticker: string; name: string; analyst: string; lastUpdated: string }) {
    if (modal && typeof modal === 'object') {
      update(modal.id, data)
      showToast('수정 완료')
    } else {
      add(data)
      showToast('등록 완료')
    }
    setModal(null)
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`"${name}" 커버리지를 삭제하시겠습니까?`)) {
      remove(id)
      showToast('삭제 완료')
    }
  }

  function handleImport(importRows: { ticker: string; name: string; analyst: string; lastUpdated: string }[]) {
    const added = importBulk(importRows)
    showToast(`${added}건 임포트 완료`)
    return added
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div>
      <PageHeader
        title="커버리지 관리"
        description="담당 종목의 6개월 업데이트 주기를 관리합니다."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {isAdmin && (
          <>
            <Button onClick={() => setModal('add')}>+ 종목 등록</Button>
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              엑셀 임포트
            </Button>
          </>
        )}
        <select
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-ink"
          value={analystFilter}
          onChange={(e) => setAnalystFilter(e.target.value)}
        >
          <option value="">전체 애널리스트 ({items.length})</option>
          {analysts.map((a) => (
            <option key={a} value={a}>
              {a} ({items.filter((c) => c.analyst === a).length})
            </option>
          ))}
        </select>
        <div className="flex items-center rounded-lg border border-neutral-200 bg-white text-sm">
          {[15, 30, 60].map((n) => (
            <button
              key={n}
              onClick={() => { setPageSize(n); setPage(1) }}
              className={`px-3 py-2 transition-colors ${pageSize === n ? 'bg-brand-500 text-white font-semibold' : 'text-neutral-600 hover:bg-neutral-100'} ${n === 15 ? 'rounded-l-lg' : ''} ${n === 60 ? 'rounded-r-lg' : 'border-r border-neutral-200'}`}
            >
              {n}건
            </button>
          ))}
        </div>
        <span className="text-sm text-neutral-500">{rows.length}건 중 {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, rows.length)}건</span>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-150 text-center text-xs text-neutral-500">
                <th className="px-5 py-3 font-medium">종목코드</th>
                <th className="px-5 py-3 font-medium">종목명</th>
                <th className="px-5 py-3 font-medium">담당 애널리스트</th>
                <th className="px-5 py-3 font-medium">최근 업데이트</th>
                <th className="px-5 py-3 font-medium">다음 기한</th>
                <th className="px-5 py-3 font-medium">상태</th>
                {isAdmin && <th className="px-5 py-3 font-medium">관리</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-150">
              {pagedRows.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-100 text-center">
                  <td className="px-5 py-3 tabular-nums text-neutral-600">{c.ticker}</td>
                  <td className="px-5 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-5 py-3 text-neutral-600">{c.analyst}</td>
                  <td className="px-5 py-3 tabular-nums text-neutral-600">{c.lastUpdated}</td>
                  <td className="px-5 py-3 tabular-nums text-neutral-600">{c.nextDue}</td>
                  <td className="px-5 py-3">
                    <Badge tone={dueTone(c.days)}>
                      {c.days < 0 ? `${-c.days}일 초과` : `D-${c.days}`}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          className="text-xs text-brand-500 hover:underline"
                          onClick={() => setModal(c)}
                        >
                          수정
                        </button>
                        <button
                          className="text-xs text-danger-600 hover:underline"
                          onClick={() => handleDelete(c.id, c.name)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-5 py-8 text-center text-sm text-neutral-500">
                    등록된 커버리지가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 border-t border-neutral-150 px-5 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${p === safePage ? 'bg-brand-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="rounded px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}
      </Card>

      {modal && (
        <CoverageModal
          initial={typeof modal === 'object' ? modal : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {showImport && (
        <ExcelImport onImport={handleImport} onClose={() => setShowImport(false)} />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
