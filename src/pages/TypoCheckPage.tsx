import { useRef, useState } from 'react'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { checkTypos, type TypoMatch } from '../lib/typoRules'

const SAMPLE_TEXT = `삼성전자의 2Q26 영업이익율은 전년 대비 개선될 것으로 보여집니다. 매출 성장율은 7.5%로 상승세를 보이고 있으며, 수익율 개선이 전망되어집니다.

SK하이닉스는 HBM4 양산 효과로 몇일 내 실적 발표가 예상됩니다. 배당율도 상향 조정될 것으로 판단되어집니다.

가동율 향상과 함께 영업이이익 증가가 확인되었으며, 목표주까 상향 가능성이 있습니다. 에널리스트 컨센선스 대비 실적이 상회했습니다.

됬다고 보기 어렵고, 안되요 라고 할수있는 상황입니다. 역활이 중요합니다.
할수있는 일을 해야 합니다. 될수없는 것는 포기하세요.`

async function extractDocxText(file: File): Promise<string> {
  if (!(window as any).mammoth) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('mammoth.js 로드 실패'))
      document.head.appendChild(script)
    })
  }
  const arrayBuffer = await file.arrayBuffer()
  const result = await (window as any).mammoth.extractRawText({ arrayBuffer })
  return result.value as string
}

export default function TypoCheckPage() {
  const [text, setText] = useState('')
  const [matches, setMatches] = useState<TypoMatch[]>([])
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const charCount = text.length
  const charCountNoSpace = text.replace(/\s/g, '').length
  const byteCount = new TextEncoder().encode(text).length

  function handleCheck() {
    if (!text.trim()) return
    const results = checkTypos(text)
    setMatches(results)
    setChecked(true)
  }

  function handleApply(match: TypoMatch) {
    const before = text.slice(0, match.index)
    const after = text.slice(match.index + match.length)
    const newText = before + match.suggestion + after
    setText(newText)
    const newMatches = checkTypos(newText)
    setMatches(newMatches)
  }

  function handleApplyAll() {
    let result = text
    const sorted = [...matches].sort((a, b) => b.index - a.index)
    for (const m of sorted) {
      result = result.slice(0, m.index) + m.suggestion + result.slice(m.index + m.length)
    }
    setText(result)
    const newMatches = checkTypos(result)
    setMatches(newMatches)
  }

  function handleLoadSample() {
    setText(SAMPLE_TEXT)
    setMatches([])
    setChecked(false)
    setFileName(null)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setFileName(file.name)
    setMatches([])
    setChecked(false)

    try {
      if (file.name.endsWith('.docx')) {
        const extracted = await extractDocxText(file)
        setText(extracted)
      } else if (file.name.endsWith('.txt')) {
        const extracted = await file.text()
        setText(extracted)
      } else {
        alert('지원 형식: .docx, .txt')
      }
    } catch (err) {
      alert('파일 읽기 실패: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleDownloadCorrected() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName ? fileName.replace(/\.\w+$/, '_교정.txt') : '교정결과.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  function renderHighlighted() {
    if (!matches.length) return <span>{text}</span>

    const parts: { text: string; isMatch: boolean; match?: TypoMatch }[] = []
    let lastEnd = 0

    for (const m of matches) {
      if (m.index > lastEnd) {
        parts.push({ text: text.slice(lastEnd, m.index), isMatch: false })
      }
      parts.push({ text: text.slice(m.index, m.index + m.length), isMatch: true, match: m })
      lastEnd = m.index + m.length
    }
    if (lastEnd < text.length) {
      parts.push({ text: text.slice(lastEnd), isMatch: false })
    }

    return parts.map((p, i) =>
      p.isMatch ? (
        <span
          key={i}
          className="bg-danger-100 text-red-700 underline decoration-wavy decoration-red-400 cursor-help"
          title={`${p.match!.rule}: "${p.match!.original}" → "${p.match!.suggestion}"`}
        >
          {p.text}
        </span>
      ) : (
        <span key={i}>{p.text}</span>
      ),
    )
  }

  return (
    <div>
      <PageHeader
        title="오타 검수"
        description="보고서 텍스트의 오타·맞춤법을 검수합니다. 텍스트 직접 입력 또는 .docx/.txt 파일을 업로드하세요."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 입력 영역 */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-neutral-500">
                검수할 텍스트
                {fileName && <span className="ml-2 text-brand-500">({fileName})</span>}
              </span>
              <div className="flex items-center gap-3">
                <button className="text-xs text-brand-500 hover:underline" onClick={handleLoadSample}>
                  샘플 텍스트
                </button>
                <button
                  className="flex items-center gap-1 text-xs text-brand-500 hover:underline"
                  onClick={() => fileRef.current?.click()}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  파일 업로드 (.docx / .txt)
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setChecked(false); setMatches([]) }}
              placeholder="검수할 텍스트를 붙여넣거나 파일을 업로드하세요..."
              rows={12}
              className="block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
            />
            {/* 글자 수 카운터 + 검수 버튼 */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button onClick={handleCheck} disabled={!text.trim() || loading}>
                  검수 시작
                </Button>
                {checked && (
                  <span className="text-sm text-neutral-600">
                    {matches.length === 0 ? '오타가 발견되지 않았습니다.' : `${matches.length}건 발견`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-400 tabular-nums">
                <span>공백 포함 <strong className="text-neutral-600">{charCount.toLocaleString()}</strong>자</span>
                <span className="text-neutral-300">|</span>
                <span>공백 제외 <strong className="text-neutral-600">{charCountNoSpace.toLocaleString()}</strong>자</span>
                <span className="text-neutral-300">|</span>
                <span><strong className="text-neutral-600">{byteCount.toLocaleString()}</strong> bytes</span>
              </div>
            </div>
          </Card>

          {/* 하이라이트 미리보기 */}
          {checked && matches.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-neutral-500">하이라이트 미리보기</span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={handleApplyAll}>
                    전체 수정 적용 ({matches.length}건)
                  </Button>
                  <button
                    onClick={handleDownloadCorrected}
                    className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    교정본 다운로드
                  </button>
                </div>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {renderHighlighted()}
              </div>
            </Card>
          )}
        </div>

        {/* 검수 결과 */}
        <div>
          <Card>
            <CardHeader title={`검수 결과 (${matches.length}건)`} />
            <div className="divide-y divide-neutral-150 max-h-[600px] overflow-y-auto">
              {matches.map((m, i) => (
                <div key={`${m.index}-${i}`} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge tone="red">{m.rule}</Badge>
                      <p className="mt-1.5 text-sm">
                        <span className="text-danger-600 line-through">{m.original}</span>
                        <span className="mx-1.5 text-neutral-500">→</span>
                        <span className="text-emerald-600 font-medium">{m.suggestion}</span>
                      </p>
                    </div>
                    <button
                      className="shrink-0 text-xs text-brand-500 hover:underline"
                      onClick={() => handleApply(m)}
                    >
                      적용
                    </button>
                  </div>
                </div>
              ))}
              {checked && matches.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-neutral-500">
                  오타가 발견되지 않았습니다.
                </p>
              )}
              {!checked && (
                <p className="px-4 py-8 text-center text-sm text-neutral-500">
                  텍스트를 입력하고 "검수 시작"을 클릭하세요.
                </p>
              )}
            </div>
          </Card>

          <Card className="mt-4 p-4">
            <p className="text-xs font-medium text-neutral-500 mb-2">검수 항목</p>
            <ul className="space-y-1 text-xs text-neutral-600">
              <li>· <span className="font-medium">맞춤법</span>: 자주 틀리는 표현 300+ 패턴</li>
              <li>· <span className="font-medium">율/률 자동 판별</span>: 앞 글자 받침 분석</li>
              <li>· <span className="font-medium">되/돼 구분</span>: 되요→돼요, 됬→됐 등</li>
              <li>· <span className="font-medium">띄어쓰기</span>: 의존명사 (때, 수, 것, 뿐 등)</li>
              <li>· <span className="font-medium">이중 피동</span>: ~되어지다, ~보여지다 등</li>
              <li>· <span className="font-medium">외래어 표기</span>: 컨텐츠→콘텐츠 등</li>
              <li>· <span className="font-medium">증권 특화</span>: 목표주가, 영업이익 오타 등</li>
              <li>· <span className="font-medium">단어 중복</span>: 연속 반복 단어 감지</li>
              <li>· <span className="font-medium">파일 지원</span>: .docx, .txt 업로드</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
