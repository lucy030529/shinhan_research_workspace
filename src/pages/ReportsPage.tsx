import { useState } from 'react'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { useReports } from '../store/reports'
import { FINANCIAL_DB, AVAILABLE_TICKERS, type FinancialData } from '../data/financials'
import { generateDraft } from '../lib/generateDraft'
import { exportDocx } from '../lib/exportDocx'

function fmt(n: number) {
  return n.toLocaleString('ko-KR')
}

type View = 'list' | 'create' | 'edit'

export default function ReportsPage() {
  const { drafts, add, update, addAttachment, removeAttachment, remove } = useReports()
  const [view, setView] = useState<View>('list')
  const [editId, setEditId] = useState<string | null>(null)

  // 생성 상태
  const [selectedTicker, setSelectedTicker] = useState(AVAILABLE_TICKERS[0])
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)

  // 편집 상태
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editOpinion, setEditOpinion] = useState('')
  const [editTargetPrice, setEditTargetPrice] = useState('')

  const currentDraft = editId ? drafts.find((d) => d.id === editId) : null

  function handleLoadFinancials() {
    const data = FINANCIAL_DB[selectedTicker]
    if (data) setFinancialData(data)
  }

  function handleGenerate() {
    if (!financialData) return
    const draft = generateDraft(financialData)
    const id = add({
      ticker: financialData.ticker,
      companyName: financialData.name,
      ...draft,
      attachments: [],
    })
    openEditor(id)
  }

  function openEditor(id: string) {
    const draft = drafts.find((d) => d.id === id) ?? useReports.getState().drafts.find((d) => d.id === id)
    if (!draft) return
    setEditId(id)
    setEditTitle(draft.title)
    setEditContent(draft.content)
    setEditOpinion(draft.opinion)
    setEditTargetPrice(draft.targetPrice)
    setView('edit')
  }

  function handleSave() {
    if (!editId) return
    update(editId, { title: editTitle, content: editContent, opinion: editOpinion, targetPrice: editTargetPrice })
    setView('list')
    setEditId(null)
  }

  function handleExportDocx() {
    if (!currentDraft) return
    const data = FINANCIAL_DB[currentDraft.ticker]
    exportDocx(
      { title: editTitle, content: editContent, opinion: editOpinion, targetPrice: editTargetPrice, companyName: currentDraft.companyName },
      data,
    )
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editId || !e.target.files) return
    for (const file of Array.from(e.target.files)) {
      const isPdf = file.name.toLowerCase().endsWith('.pdf')
      addAttachment(editId, { name: file.name, type: isPdf ? 'pdf' : 'file', size: file.size })
    }
    e.target.value = ''
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`"${name}" 보고서를 삭제하시겠습니까?`)) {
      remove(id)
    }
  }

  // --- 목록 뷰 ---
  if (view === 'list') {
    return (
      <div>
        <PageHeader
          title="보고서 작성"
          description="재무데이터 자동 로드 → AI 초안 생성 → 편집 → Word 내보내기."
        />
        <div className="mb-4">
          <Button onClick={() => { setFinancialData(null); setView('create') }}>+ 새 보고서</Button>
        </div>

        {drafts.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-faint">
            작성된 보고서가 없습니다. "새 보고서" 버튼으로 시작하세요.
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-slate-100">
              {drafts.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-ink">{d.title}</p>
                    <p className="text-xs text-ink-faint">
                      {d.companyName} ({d.ticker}) · 투자의견 {d.opinion} · 목표 {d.targetPrice}원
                      {d.attachments.length > 0 && ` · 첨부 ${d.attachments.length}건`}
                    </p>
                    <p className="text-xs text-ink-faint">
                      수정 {new Date(d.updatedAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-xs text-brand-600 hover:underline" onClick={() => openEditor(d.id)}>
                      편집
                    </button>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => handleDelete(d.id, d.title)}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  // --- 생성 뷰 (기업 선택 + 재무 로드 + AI 초안) ---
  if (view === 'create') {
    return (
      <div>
        <PageHeader title="새 보고서 작성" description="기업을 선택하고 재무데이터를 로드하여 AI 초안을 생성합니다." />
        <button className="mb-4 text-sm text-brand-600 hover:underline" onClick={() => setView('list')}>
          ← 목록으로
        </button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 기업 선택 */}
          <Card>
            <CardHeader title="1. 기업 선택 · 재무데이터 로드" />
            <div className="p-5">
              <div className="flex gap-3">
                <select
                  value={selectedTicker}
                  onChange={(e) => { setSelectedTicker(e.target.value); setFinancialData(null) }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {AVAILABLE_TICKERS.map((t) => (
                    <option key={t} value={t}>{FINANCIAL_DB[t].name} ({t})</option>
                  ))}
                </select>
                <Button onClick={handleLoadFinancials}>재무 로드</Button>
              </div>

              {financialData && (
                <div className="mt-4">
                  <Badge tone="green">로드 완료</Badge>
                  <p className="mt-2 text-xs text-ink-faint">
                    {financialData.name} · {financialData.currency} · 기간: {financialData.periods.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* 재무 테이블 미리보기 */}
          {financialData && (
            <Card>
              <CardHeader title="재무 요약" action={<Badge tone="brand">{financialData.currency}</Badge>} />
              <div className="overflow-x-auto p-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-ink-faint">
                      <th className="px-3 py-2 font-medium">항목</th>
                      {financialData.periods.map((p) => (
                        <th key={p} className="px-3 py-2 text-right font-medium">{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {([
                      ['매출액', financialData.incomeStatement.revenue],
                      ['영업이익', financialData.incomeStatement.operatingProfit],
                      ['순이익', financialData.incomeStatement.netIncome],
                      ['EPS', financialData.incomeStatement.eps],
                      ['PER', financialData.metrics.per],
                      ['PBR', financialData.metrics.pbr],
                      ['ROE (%)', financialData.metrics.roe],
                      ['영업이익률 (%)', financialData.metrics.operatingMargin],
                    ] as [string, number[]][]).map(([label, values]) => (
                      <tr key={label} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-medium text-ink-soft">{label}</td>
                        {values.map((v, i) => (
                          <td key={i} className="px-3 py-1.5 text-right tabular-nums">{fmt(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {financialData && (
          <div className="mt-6">
            <Button onClick={handleGenerate}>AI 초안 생성</Button>
            <span className="ml-3 text-xs text-ink-faint">재무 데이터 기반으로 보고서 초안을 자동 생성합니다 (목업)</span>
          </div>
        )}
      </div>
    )
  }

  // --- 편집 뷰 ---
  return (
    <div>
      <PageHeader title="보고서 편집" description={currentDraft ? `${currentDraft.companyName} (${currentDraft.ticker})` : ''} />
      <button className="mb-4 text-sm text-brand-600 hover:underline" onClick={() => { handleSave(); setView('list') }}>
        ← 저장 후 목록으로
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* 제목 */}
          <Card className="p-5">
            <label className="block">
              <span className="text-xs font-medium text-ink-faint">보고서 제목</span>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
          </Card>

          {/* 본문 에디터 */}
          <Card className="p-5">
            <label className="block">
              <span className="text-xs font-medium text-ink-faint">본문</span>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={18}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono leading-relaxed"
              />
            </label>
          </Card>
        </div>

        <div className="space-y-4">
          {/* 투자의견 / 목표주가 */}
          <Card className="p-5 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-ink-faint">투자의견</span>
              <select
                value={editOpinion}
                onChange={(e) => setEditOpinion(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="매수">매수 (BUY)</option>
                <option value="Trading BUY">Trading BUY</option>
                <option value="중립">중립 (HOLD)</option>
                <option value="매도">매도 (SELL)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-faint">목표주가 (원)</span>
              <input
                type="text"
                value={editTargetPrice}
                onChange={(e) => setEditTargetPrice(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
          </Card>

          {/* 첨부파일 (IR PDF 등) */}
          <Card>
            <CardHeader title="첨부파일 (IR PDF 등)" />
            <div className="p-4">
              <input
                type="file"
                accept=".pdf,.pptx,.xlsx,.docx"
                multiple
                onChange={handleFileUpload}
                className="block w-full text-xs text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-700 hover:file:bg-brand-100"
              />
              {currentDraft && currentDraft.attachments.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {currentDraft.attachments.map((a) => (
                    <li key={a.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <Badge tone={a.type === 'pdf' ? 'red' : 'slate'}>
                          {a.type === 'pdf' ? 'PDF' : 'FILE'}
                        </Badge>
                        <span className="text-ink-soft">{a.name}</span>
                        <span className="text-ink-faint">({(a.size / 1024).toFixed(0)}KB)</span>
                      </span>
                      <button
                        className="text-red-500 hover:underline"
                        onClick={() => removeAttachment(editId!, a.name)}
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* 액션 버튼 */}
          <div className="space-y-2">
            <Button className="w-full" onClick={handleSave}>저장</Button>
            <Button className="w-full" variant="secondary" onClick={handleExportDocx}>
              Word(.docx) 내보내기
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
