import { useState } from 'react'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { checkTypos, type TypoMatch } from '../lib/typoRules'

const SAMPLE_TEXT = `삼성전자의 2Q26 영업이익율은 전년 대비 개선될 것으로 보여집니다. 매출 성장율은 7.5%로 상승세를 보이고 있으며, 수익율 개선이 전망되어집니다.

SK하이닉스는 HBM4 양산 효과로 몇일 내 실적 발표가 예상됩니다. 배당율도 상향 조정될 것으로 판단되어집니다.`

export default function TypoCheckPage() {
  const [text, setText] = useState('')
  const [matches, setMatches] = useState<TypoMatch[]>([])
  const [checked, setChecked] = useState(false)

  function handleCheck() {
    const result = checkTypos(text)
    setMatches(result)
    setChecked(true)
  }

  function handleApply(match: TypoMatch) {
    const before = text.slice(0, match.index)
    const after = text.slice(match.index + match.length)
    const newText = before + match.suggestion + after

    setText(newText)

    // 재검사 (인덱스 변경 반영)
    const newMatches = checkTypos(newText)
    setMatches(newMatches)
  }

  function handleApplyAll() {
    let result = text
    // 뒤에서부터 적용해야 인덱스가 꼬이지 않음
    const sorted = [...matches].sort((a, b) => b.index - a.index)
    for (const m of sorted) {
      result = result.slice(0, m.index) + m.suggestion + result.slice(m.index + m.length)
    }
    setText(result)
    setMatches([])
  }

  function handleLoadSample() {
    setText(SAMPLE_TEXT)
    setMatches([])
    setChecked(false)
  }

  // 하이라이트된 텍스트 생성
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
          className="bg-red-100 text-red-700 underline decoration-wavy decoration-red-400 cursor-help"
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
        description="보고서 텍스트의 오타·맞춤법 의심 구간을 검수합니다. 증권 리서치 특화 규칙 포함."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 입력 영역 */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-ink-faint">검수할 텍스트</span>
              <button className="text-xs text-brand-600 hover:underline" onClick={handleLoadSample}>
                샘플 텍스트 불러오기
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setChecked(false); setMatches([]) }}
              placeholder="검수할 텍스트를 붙여넣으세요..."
              rows={10}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
            />
            <div className="mt-3 flex items-center gap-3">
              <Button onClick={handleCheck} disabled={!text.trim()}>검수 시작</Button>
              {checked && (
                <span className="text-sm text-ink-soft">
                  {matches.length === 0 ? '오타가 발견되지 않았습니다.' : `${matches.length}건 발견`}
                </span>
              )}
            </div>
          </Card>

          {/* 하이라이트 미리보기 */}
          {checked && matches.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-ink-faint">하이라이트 미리보기</span>
                <Button variant="secondary" onClick={handleApplyAll}>
                  전체 수정 적용 ({matches.length}건)
                </Button>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {renderHighlighted()}
              </div>
            </Card>
          )}
        </div>

        {/* 검수 결과 */}
        <div>
          <Card>
            <CardHeader title={`검수 결과 (${matches.length}건)`} />
            <div className="divide-y divide-slate-100">
              {matches.map((m, i) => (
                <div key={`${m.index}-${i}`} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge tone="red">{m.rule}</Badge>
                      <p className="mt-1.5 text-sm">
                        <span className="text-red-600 line-through">{m.original}</span>
                        <span className="mx-1.5 text-ink-faint">→</span>
                        <span className="text-emerald-600 font-medium">{m.suggestion}</span>
                      </p>
                    </div>
                    <button
                      className="shrink-0 text-xs text-brand-600 hover:underline"
                      onClick={() => handleApply(m)}
                    >
                      적용
                    </button>
                  </div>
                </div>
              ))}
              {checked && matches.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-ink-faint">
                  오타가 발견되지 않았습니다.
                </p>
              )}
              {!checked && (
                <p className="px-4 py-8 text-center text-sm text-ink-faint">
                  텍스트를 입력하고 "검수 시작"을 클릭하세요.
                </p>
              )}
            </div>
          </Card>

          <Card className="mt-4 p-4">
            <p className="text-xs font-medium text-ink-faint mb-2">지원 규칙</p>
            <ul className="space-y-1 text-xs text-ink-soft">
              <li>· 띄어쓰기 오류</li>
              <li>· 일반 맞춤법 (몇일→며칠 등)</li>
              <li>· 이중 피동 (되어지→되)</li>
              <li>· 증권 특화: 율→률 (영업이익률, 수익률 등)</li>
              <li>· 군더더기 표현 정리</li>
              <li>· 중복 단위 (억원원, 퍼센트%)</li>
            </ul>
            <p className="mt-2 text-xs text-ink-faint">
              * 규칙 기반 목업. 맞춤법 API 연동 시 정밀도 향상.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
