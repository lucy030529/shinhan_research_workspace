export interface TypoMatch {
  index: number
  length: number
  original: string
  suggestion: string
  rule: string
}

interface Rule {
  pattern: RegExp
  suggestion: (match: string, ...groups: string[]) => string
  rule: string
}

const RULES: Rule[] = [
  // === 띄어쓰기 (붙여야 할 것) ===
  { pattern: /문의 사항/g, suggestion: () => '문의사항', rule: '붙여쓰기' },
  { pattern: /의사 결정/g, suggestion: () => '의사결정', rule: '붙여쓰기' },
  { pattern: /영업 이익/g, suggestion: () => '영업이익', rule: '붙여쓰기' },
  { pattern: /시장 점유율/g, suggestion: () => '시장점유율', rule: '붙여쓰기' },

  // === 띄어쓰기 (띄어야 할 것) ===
  { pattern: /할수있/g, suggestion: () => '할 수 있', rule: '띄어쓰기' },
  { pattern: /될수있/g, suggestion: () => '될 수 있', rule: '띄어쓰기' },
  { pattern: /할수없/g, suggestion: () => '할 수 없', rule: '띄어쓰기' },
  { pattern: /될수없/g, suggestion: () => '될 수 없', rule: '띄어쓰기' },
  { pattern: /안될/g, suggestion: () => '안 될', rule: '띄어쓰기' },
  { pattern: /못할/g, suggestion: () => '못 할', rule: '띄어쓰기' },
  { pattern: /그동안/g, suggestion: () => '그동안', rule: '' }, // skip (valid)
  { pattern: /한편으로/g, suggestion: () => '한편으로', rule: '' },

  // === 맞춤법 (일반) ===
  { pattern: /되어지/g, suggestion: () => '되', rule: '이중 피동' },
  { pattern: /몇일/g, suggestion: () => '며칠', rule: '맞춤법' },
  { pattern: /않되/g, suggestion: () => '안 되', rule: '맞춤법' },
  { pattern: /안되/g, suggestion: () => '안 돼', rule: '맞춤법' },
  { pattern: /웬지/g, suggestion: () => '왠지', rule: '맞춤법' },
  { pattern: /왠만/g, suggestion: () => '웬만', rule: '맞춤법' },
  { pattern: /희안/g, suggestion: () => '희한', rule: '맞춤법' },
  { pattern: /갯수/g, suggestion: () => '개수', rule: '맞춤법' },
  { pattern: /어의없/g, suggestion: () => '어이없', rule: '맞춤법' },
  { pattern: /곤난/g, suggestion: () => '곤란', rule: '맞춤법' },
  { pattern: /홧팅/g, suggestion: () => '파이팅', rule: '외래어 표기' },
  { pattern: /금새/g, suggestion: () => '금세', rule: '맞춤법' },
  { pattern: /일일히/g, suggestion: () => '일일이', rule: '맞춤법' },
  { pattern: /어떻게 됬/g, suggestion: () => '어떻게 됐', rule: '맞춤법' },
  { pattern: /됬/g, suggestion: () => '됐', rule: '맞춤법' },
  { pattern: /봤을때/g, suggestion: () => '봤을 때', rule: '띄어쓰기' },
  { pattern: /했을때/g, suggestion: () => '했을 때', rule: '띄어쓰기' },
  { pattern: /될때/g, suggestion: () => '될 때', rule: '띄어쓰기' },
  { pattern: /할때/g, suggestion: () => '할 때', rule: '띄어쓰기' },
  { pattern: /올때/g, suggestion: () => '올 때', rule: '띄어쓰기' },
  { pattern: /있을때/g, suggestion: () => '있을 때', rule: '띄어쓰기' },
  { pattern: /없을때/g, suggestion: () => '없을 때', rule: '띄어쓰기' },
  { pattern: /로써(?=[^의]|$)/g, suggestion: () => '로서', rule: '맞춤법 (자격: 로서)' },
  { pattern: /로서(?=\s[사활만])/g, suggestion: () => '로서', rule: '' }, // valid, skip
  { pattern: /네요/g, suggestion: () => '네요', rule: '' }, // valid, skip
  { pattern: /데요/g, suggestion: () => '데요', rule: '' }, // valid, skip

  // === 율/률 규칙 (모음·ㄴ 뒤 → 율, 그 외 → 률) ===
  { pattern: /영업이익율/g, suggestion: () => '영업이익률', rule: '율→률 (받침 뒤)' },
  { pattern: /수익율/g, suggestion: () => '수익률', rule: '율→률 (받침 뒤)' },
  { pattern: /이익율/g, suggestion: () => '이익률', rule: '율→률 (받침 뒤)' },
  { pattern: /성장율/g, suggestion: () => '성장률', rule: '율→률 (받침 뒤)' },
  { pattern: /배당율/g, suggestion: () => '배당률', rule: '율→률 (받침 뒤)' },
  { pattern: /가동율/g, suggestion: () => '가동률', rule: '율→률 (받침 뒤)' },
  { pattern: /점유율율/g, suggestion: () => '점유율', rule: '중복' },
  { pattern: /실현율/g, suggestion: () => '실현률', rule: '율→률 (받침 뒤)' },
  { pattern: /달성율/g, suggestion: () => '달성률', rule: '율→률 (받침 뒤)' },
  { pattern: /감소율/g, suggestion: () => '감소율', rule: '' }, // 모음 뒤 → 율 (정상)
  { pattern: /증가율/g, suggestion: () => '증가율', rule: '' }, // 모음 뒤 → 율 (정상)
  { pattern: /확율/g, suggestion: () => '확률', rule: '율→률 (받침 뒤)' },
  { pattern: /효율율/g, suggestion: () => '효율', rule: '중복' },

  // === 이중 피동 / 불필요 표현 (증권 리서치 특화) ===
  { pattern: /것으로 보여집니다/g, suggestion: () => '것으로 보입니다', rule: '이중 피동' },
  { pattern: /것으로 판단되어집니다/g, suggestion: () => '것으로 판단됩니다', rule: '이중 피동' },
  { pattern: /전망되어집니다/g, suggestion: () => '전망됩니다', rule: '이중 피동' },
  { pattern: /예상되어집니다/g, suggestion: () => '예상됩니다', rule: '이중 피동' },
  { pattern: /추정되어집니다/g, suggestion: () => '추정됩니다', rule: '이중 피동' },
  { pattern: /기대되어집니다/g, suggestion: () => '기대됩니다', rule: '이중 피동' },
  { pattern: /분석되어집니다/g, suggestion: () => '분석됩니다', rule: '이중 피동' },
  { pattern: /파악되어집니다/g, suggestion: () => '파악됩니다', rule: '이중 피동' },
  { pattern: /나타나여지/g, suggestion: () => '나타나', rule: '이중 피동' },
  { pattern: /상승세를 보이고 있/g, suggestion: () => '상승하고 있', rule: '군더더기 표현' },
  { pattern: /하락세를 보이고 있/g, suggestion: () => '하락하고 있', rule: '군더더기 표현' },
  { pattern: /증가세를 보이고 있/g, suggestion: () => '증가하고 있', rule: '군더더기 표현' },
  { pattern: /감소세를 보이고 있/g, suggestion: () => '감소하고 있', rule: '군더더기 표현' },
  { pattern: /개선세를 보이고 있/g, suggestion: () => '개선되고 있', rule: '군더더기 표현' },

  // === 숫자·단위 ===
  { pattern: /(\d)억원원/g, suggestion: (_m, g1) => g1 + '억원', rule: '중복 단위' },
  { pattern: /퍼센트%/g, suggestion: () => '%', rule: '중복 단위' },
  { pattern: /(\d)조원원/g, suggestion: (_m, g1) => g1 + '조원', rule: '중복 단위' },

  // === 증권 용어 오기 ===
  { pattern: /목표주까/g, suggestion: () => '목표주가', rule: '오타' },
  { pattern: /영업이이익/g, suggestion: () => '영업이익', rule: '오타 (중복)' },
  { pattern: /당기순이이익/g, suggestion: () => '당기순이익', rule: '오타 (중복)' },
  { pattern: /밸류에이숀/g, suggestion: () => '밸류에이션', rule: '외래어 표기' },
  { pattern: /밸류에이쎤/g, suggestion: () => '밸류에이션', rule: '외래어 표기' },
  { pattern: /컨센선스/g, suggestion: () => '컨센서스', rule: '외래어 표기' },
  { pattern: /컨센써스/g, suggestion: () => '컨센서스', rule: '외래어 표기' },
  { pattern: /포트폴리요/g, suggestion: () => '포트폴리오', rule: '외래어 표기' },
  { pattern: /에널리스트/g, suggestion: () => '애널리스트', rule: '외래어 표기' },
]

export function checkTypos(text: string): TypoMatch[] {
  const matches: TypoMatch[] = []

  for (const rule of RULES) {
    if (!rule.rule) continue
    rule.pattern.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = rule.pattern.exec(text)) !== null) {
      const groups = m.slice(1)
      const suggestion = rule.suggestion(m[0], ...groups)
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
