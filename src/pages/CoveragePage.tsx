import { useState } from 'react'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { useCoverage } from '../store/coverage'
import { daysUntil, dueTone } from '../lib/utils'
import CoverageModal from '../components/coverage/CoverageModal'
import ExcelImport from '../components/coverage/ExcelImport'
import type { CoverageItem } from '../types'

export default function CoveragePage() {
  const { items, add, update, remove, importBulk } = useCoverage()
  const [modal, setModal] = useState<'add' | CoverageItem | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [analystFilter, setAnalystFilter] = useState<string>('')

  const analysts = [...new Set(items.map((c) => c.analyst))].sort()

  const rows = [...items]
    .filter((c) => !analystFilter || c.analyst === analystFilter)
    .map((c) => ({ ...c, days: daysUntil(c.nextDue) }))
    .sort((a, b) => a.days - b.days)

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
        <Button onClick={() => setModal('add')}>+ 종목 등록</Button>
        <Button variant="secondary" onClick={() => setShowImport(true)}>
          엑셀 임포트
        </Button>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink"
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
        <span className="text-sm text-ink-faint">{rows.length}건 표시</span>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-ink-faint">
                <th className="px-5 py-3 font-medium">종목코드</th>
                <th className="px-5 py-3 font-medium">종목명</th>
                <th className="px-5 py-3 font-medium">담당 애널리스트</th>
                <th className="px-5 py-3 font-medium">최근 업데이트</th>
                <th className="px-5 py-3 font-medium">다음 기한</th>
                <th className="px-5 py-3 font-medium">상태</th>
                <th className="px-5 py-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 tabular-nums text-ink-soft">{c.ticker}</td>
                  <td className="px-5 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-5 py-3 text-ink-soft">{c.analyst}</td>
                  <td className="px-5 py-3 tabular-nums text-ink-soft">{c.lastUpdated}</td>
                  <td className="px-5 py-3 tabular-nums text-ink-soft">{c.nextDue}</td>
                  <td className="px-5 py-3">
                    <Badge tone={dueTone(c.days)}>
                      {c.days < 0 ? `${-c.days}일 초과` : `D-${c.days}`}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        className="text-xs text-brand-600 hover:underline"
                        onClick={() => setModal(c)}
                      >
                        수정
                      </button>
                      <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => handleDelete(c.id, c.name)}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-ink-faint">
                    등록된 커버리지가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
