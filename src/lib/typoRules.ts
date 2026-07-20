// Phase 5 오타·맞춤법 검수 규칙 기반 엔진 (목업).
// 실제 연동 시 맞춤법 API(네이버 맞춤법 검사기 등) 어댑터로 교체합니다.

export interface TypoMatch {
  index: number
  length: number
  original: string
  suggestion: string
  rule: string
}

interface Rule {
  pattern: RegExp
  suggestion: (match: string) => string
  rule: string
}

const RULES: Rule[] = [
  // 흔한 띄어쓰기 오류
  { pattern: /할수있/g, suggestion: () => '할 수 있', rule: '띄어쓰기' },
  { pattern: /될수있/g, suggestion: () => '될 수 있', rule: '띄어쓰기' },
  { pattern: /할수록/g, suggestion: () => '할수록', rule: '띄어쓰기 (붙여씀)' },
  { pattern: /안될/g, suggestion: () => '안 될', rule: '띄어쓰기' },
  { pattern: /못할/g, suggestion: () => '못 할', rule: '띄어쓰기' },

  // 맞춤법
  { pattern: /되어지/g, suggestion: () => '되', rule: '이중 피동 (되어지→되)' },
  { pattern: /홧팅/g, suggestion: () => '파이팅', rule: '외래어 표기' },
  { pattern: /문의 사항/g, suggestion: () => '문의사항', rule: '붙여쓰기 (한 단어)' },
  { pattern: /몇일/g, suggestion: () => '며칠', rule: '맞춤법' },
  { pattern: /않되/g, suggestion: () => '안 되', rule: '맞춤법 (않되→안 되)' },
  { pattern: /웬지/g, suggestion: () => '왠지', rule: '맞춤법' },
  { pattern: /왠만/g, suggestion: () => '웬만', rule: '맞춤법' },
  { pattern: /희안/g, suggestion: () => '희한', rule: '맞춤법' },
  { pattern: /갯수/g, suggestion: () => '개수', rule: '맞춤법' },
  { pattern: /어의없/g, suggestion: () => '어이없', rule: '맞춤법' },
  { pattern: /곤난/g, suggestion: () => '곤란', rule: '맞춤법' },

  // 증권 리서치 특화
  { pattern: /영업이익율/g, suggestion: () => '영업이익률', rule: '한글 맞춤법 (율→률)' },
  { pattern: /수익율/g, suggestion: () => '수익률', rule: '한글 맞춤법 (율→률)' },
  { pattern: /이익율/g, suggestion: () => '이익률', rule: '한글 맞춤법 (율→률)' },
  { pattern: /성장율/g, suggestion: () => '성장률', rule: '한글 맞춤법 (율→률)' },
  { pattern: /배당율/g, suggestion: () => '배당률', rule: '한글 맞춤법 (율→률)' },
  { pattern: /비율율/g, suggestion: () => '비율', rule: '중복' },
  { pattern: /상승세를 보이고 있/g, suggestion: () => '상승하고 있', rule: '군더더기 표현' },
  { pattern: /하락세를 보이고 있/g, suggestion: () => '하락하고 있', rule: '군더더기 표현' },
  { pattern: /것으로 보여집니다/g, suggestion: () => '것으로 보입니다', rule: '이중 피동' },
  { pattern: /것으로 판단되어집니다/g, suggestion: () => '것으로 판단됩니다', rule: '이중 피동' },
  { pattern: /전망되어집니다/g, suggestion: () => '전망됩니다', rule: '이중 피동' },
  { pattern: /예상되어집니다/g, suggestion: () => '예상됩니다', rule: '이중 피동' },
  { pattern: /추정되어집니다/g, suggestion: () => '추정됩니다', rule: '이중 피동' },

  // 숫자·단위
  { pattern: /(\d),(\d{3})원/g, suggestion: (m) => m, rule: '' }, // skip valid
  { pattern: /(\d)억원원/g, suggestion: (m) => m.replace('원원', '원'), rule: '중복 단위' },
  { pattern: /퍼센트%/g, suggestion: () => '%', rule: '중복 단위' },
]

export function checkTypos(text: string): TypoMatch[] {
  const matches: TypoMatch[] = []

  for (const rule of RULES) {
    if (!rule.rule) continue
    let m: RegExpExecArray | null
    // Reset lastIndex for global regex
    rule.pattern.lastIndex = 0
    while ((m = rule.pattern.exec(text)) !== null) {
      const suggestion = rule.suggestion(m[0])
      if (suggestion !== m[0]) {
        matches.push({
          index: m.index,
          length: m[0].length,
          original: m[0],
          suggestion,
          rule: rule.rule,
        })
      }
    }
  }

  return matches.sort((a, b) => a.index - b.index)
}
