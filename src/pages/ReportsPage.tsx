import { useState, useRef } from 'react'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { REPORT_TYPES, type ReportType } from '../data/reportPrompts'
import { generateReport, buildPrompt } from '../lib/generateReport'
import { extractText, formatFileSize } from '../lib/fileExtract'
import { renderMarkdown } from '../lib/renderMarkdown'

export default function ReportsPage() {
  // 입력 상태
  const [reportType, setReportType] = useState<ReportType>('qa')
  const [company, setCompany] = useState('')
  const [quarter, setQuarter] = useState('')
  const [pubDate, setPubDate] = useState(new Date().toISOString().slice(0, 10))
  const [scriptText, setScriptText] = useState('')
  const [extraNotes, setExtraNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])

  // 출력 상태
  const [rawMarkdown, setRawMarkdown] = useState('')
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')

  // 프롬프트 보기
  const [showPrompt, setShowPrompt] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const typeInfo = REPORT_TYPES.find((t) => t.value === reportType)!
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return
    const arr = Array.from(newFiles)
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size))
      return [...prev, ...arr.filter((f) => !existing.has(f.name + f.size))]
    })
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleGenerate() {
    if (!company && !scriptText && files.length === 0) {
      alert('기업명을 입력하거나, 스크립트/파일을 제공해주세요.')
      return
    }

    setGenerating(true)
    setStatus('generating')
    setRawMarkdown('')

    try {
      // 파일 텍스트 추출
      const fileTexts: string[] = []
      for (const f of files) {
        const text = await extractText(f)
        fileTexts.push(`[파일: ${f.name}]\n${text}`)
      }

      const result = await generateReport(
        { reportType, company, quarter, pubDate, scriptText, fileTexts, extraNotes },
        (partialText) => {
          setRawMarkdown(partialText)
          // 자동 스크롤
          if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight
          }
        },
      )

      setRawMarkdown(result)
      setStatus('done')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류'
      setRawMarkdown(`오류: ${msg}`)
      setStatus('error')
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(rawMarkdown)
  }

  function handleDownloadTxt() {
    const typeLabels: Record<ReportType, string> = { qa: 'QA', sokbo: '속보', review: '실적리뷰', overseas: '해외기업', note: '컨콜노트' }
    const fname = `${company || '레포트'}_${quarter}_${typeLabels[reportType]}.txt`.replace(/\s+/g, '_')
    const blob = new Blob([rawMarkdown], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fname
    a.click()
  }

  async function handleDownloadDocx() {
    try {
      const resp = await fetch('/api/download-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: rawMarkdown,
          reportType,
          company: company || '레포트',
          pubDate,
        }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        alert(err.error || 'DOCX 생성 실패')
        return
      }
      const blob = await resp.blob()
      const typeLabels: Record<ReportType, string> = { qa: 'QA', sokbo: '속보', review: '실적리뷰', overseas: '해외기업', note: '컨콜노트' }
      const fname = `${company || '레포트'}_${typeLabels[reportType]}.docx`.replace(/\s+/g, '_')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = fname
      a.click()
    } catch {
      alert('DOCX 다운로드 실패. 로컬 서버(node server.mjs)가 실행 중인지 확인해주세요.')
    }
  }

  async function handleDownloadPdf() {
    try {
      const resp = await fetch('/api/download-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: rawMarkdown,
          company: company || '레포트',
        }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        alert(err.error || 'PDF 생성 실패')
        return
      }
      const blob = await resp.blob()
      const fname = `${company || '레포트'}_컨콜노트.pdf`.replace(/\s+/g, '_')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = fname
      a.click()
    } catch {
      alert('PDF 다운로드 실패. 로컬 서버(node server.mjs)가 실행 중인지 확인해주세요.')
    }
  }

  function handleViewPrompt() {
    setShowPrompt(!showPrompt)
  }

  const prompt = buildPrompt({ reportType, company, quarter, pubDate, scriptText, fileTexts: [], extraNotes })

  return (
    <div>
      <PageHeader
        title="보고서 작성"
        description="자료 입력 → AI 초안 생성 → 편집 → Word 내보내기."
      />

      {!isLocal && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>안내:</strong> 레포트 생성 및 DOCX/PDF 다운로드는 로컬 환경에서만 지원됩니다.
          <code className="mx-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs">node server.mjs</code> 실행 후
          <code className="mx-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs">npm run dev</code>로 접속해주세요.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* 좌측: 입력 패널 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 기본 정보 */}
          <Card>
            <CardHeader title="1. 기본 정보" />
            <div className="p-5 space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-ink-faint">레포트 유형</span>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-ink-faint">기업명 <span className="text-ink-faint font-normal">(또는 섹터명)</span></span>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="예: HD현대중공업"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink-faint">분기</span>
                  <input
                    type="text"
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                    placeholder="예: 1Q26"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-ink-faint">발간일</span>
                <input
                  type="date"
                  value={pubDate}
                  onChange={(e) => setPubDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </label>
            </div>
          </Card>

          {/* 자료 입력 */}
          <Card>
            <CardHeader title="2. 자료 입력" />
            <div className="p-5 space-y-4">
              {/* 파일 업로드 */}
              <div>
                <span className="text-xs font-medium text-ink-faint">파일 업로드 <span className="font-normal">(TXT, XLSX, PDF, DOCX)</span></span>
                <div
                  className="mt-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-brand-500') }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('border-brand-500')}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-brand-500'); addFiles(e.dataTransfer.files) }}
                >
                  <p className="text-2xl text-slate-300">+</p>
                  <p className="mt-1 text-xs text-ink-faint"><strong className="text-brand-600">클릭</strong>하거나 파일을 <strong className="text-brand-600">드래그</strong>하세요</p>
                  <p className="text-xs text-ink-faint mt-0.5">실적발표 스크립트, IR자료, 컨콜전문 등</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.xlsx,.xls,.csv,.pdf,.docx"
                  className="hidden"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
                />
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <div key={f.name + f.size} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs">
                        <div>
                          <span className="font-medium text-ink">{f.name}</span>
                          <span className="ml-2 text-ink-faint">{formatFileSize(f.size)}</span>
                        </div>
                        <button className="text-red-500 hover:text-red-700" onClick={() => removeFile(i)}>x</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 스크립트 직접 입력 */}
              <label className="block">
                <span className="text-xs font-medium text-ink-faint">스크립트 직접 입력 <span className="font-normal">(선택)</span></span>
                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="실적발표 스크립트 또는 컨퍼런스콜 전문을 붙여넣으세요..."
                  rows={8}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed font-mono"
                />
              </label>

              {/* 추가 메모 */}
              <label className="block">
                <span className="text-xs font-medium text-ink-faint">추가 메모 <span className="font-normal">(선택)</span></span>
                <textarea
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="특별히 다뤄야 할 이슈, 경쟁사 비교 포인트 등..."
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </label>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? '생성 중...' : typeInfo.buttonLabel}
              </Button>

              <button
                className="w-full text-xs text-ink-faint hover:text-brand-600 hover:underline"
                onClick={handleViewPrompt}
              >
                {showPrompt ? '시스템 프롬프트 숨기기' : '시스템 프롬프트 보기'}
              </button>
            </div>
          </Card>

          {/* 프롬프트 미리보기 */}
          {showPrompt && (
            <Card>
              <CardHeader title="시스템 프롬프트" action={<Badge tone="brand">{typeInfo.label}</Badge>} />
              <div className="p-4 max-h-64 overflow-auto">
                <pre className="text-xs text-ink-soft whitespace-pre-wrap font-mono leading-relaxed">{prompt.system}</pre>
              </div>
            </Card>
          )}
        </div>

        {/* 우측: 출력 패널 */}
        <div className="lg:col-span-3">
          <Card className="sticky top-6">
            <CardHeader
              title="생성 결과"
              action={
                <span className="text-xs text-ink-faint">
                  {status === 'generating' && '생성 중...'}
                  {status === 'done' && '완료'}
                  {status === 'error' && '오류'}
                </span>
              }
            />
            <div ref={outputRef} className="p-6 min-h-[400px] max-h-[calc(100vh-200px)] overflow-auto">
              {status === 'idle' && (
                <div className="flex flex-col items-center justify-center h-[350px] text-ink-faint text-center">
                  <p className="text-4xl opacity-20 mb-4">&#9998;</p>
                  <p className="text-sm">
                    좌측에 자료를 입력하고<br />
                    <strong className="text-ink">{typeInfo.buttonLabel}</strong> 버튼을 눌러주세요
                  </p>
                </div>
              )}
              {status === 'generating' && !rawMarkdown && (
                <div className="flex items-center gap-2 text-sm text-ink-soft">
                  <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
                  Claude API 호출 중...
                </div>
              )}
              {rawMarkdown && (
                <div
                  className="prose-report text-sm leading-[1.85] text-ink"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(rawMarkdown) }}
                />
              )}
              {status === 'generating' && rawMarkdown && (
                <span className="inline-block w-[2px] h-4 bg-brand-600 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>

            {/* 하단 툴바 */}
            {status === 'done' && rawMarkdown && (
              <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
                <button className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-600 hover:border-brand-300 transition-colors" onClick={handleCopy}>
                  복사
                </button>
                <button className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors" onClick={handleDownloadDocx}>
                  DOCX 다운로드
                </button>
                {reportType === 'note' && (
                  <button className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors" onClick={handleDownloadPdf}>
                    PDF 다운로드
                  </button>
                )}
                <button className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-600 hover:border-brand-300 transition-colors" onClick={handleDownloadTxt}>
                  TXT 다운로드
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
