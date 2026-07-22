// 완전 로컬 한국어 맞춤법 검사 엔진
// 외부 API 의존 없이 브라우저에서 즉시 실행

export interface TypoMatch {
  index: number
  length: number
  original: string
  suggestion: string
  rule: string
}

// ═══════════════════════════════════════════
// 한글 유니코드 유틸
// ═══════════════════════════════════════════

const HANGUL_START = 0xac00
const HANGUL_END = 0xd7a3

// 종성(받침) 인덱스: 0=없음, 1=ㄱ, 2=ㄲ, 3=ㄳ, 4=ㄴ, ...
function getJongsung(ch: string): number {
  const c = ch.charCodeAt(0)
  if (c < HANGUL_START || c > HANGUL_END) return -1
  return (c - HANGUL_START) % 28
}

// ═══════════════════════════════════════════
// 1. 체계적 규칙 (한국어 문법 기반 자동 판별)
// ═══════════════════════════════════════════

// --- 율/률 자동 판별 ---
// 모음 또는 ㄴ 받침 뒤 → 율, 그 외 받침 뒤 → 률
function checkYulRyul(text: string): TypoMatch[] {
  const matches: TypoMatch[] = []

  // "X율" → 받침(ㄴ 제외) 뒤면 "X률"
  const yulRe = /([가-힣])율/g
  let m: RegExpExecArray | null
  while ((m = yulRe.exec(text)) !== null) {
    const j = getJongsung(m[1])
    if (j > 0 && j !== 4) {
      matches.push({
        index: m.index, length: m[0].length,
        original: m[0], suggestion: m[1] + '률',
        rule: '율→률 (받침 뒤)',
      })
    }
  }

  // "X률" → 모음/ㄴ 뒤면 "X율"
  const ryulRe = /([가-힣])률/g
  while ((m = ryulRe.exec(text)) !== null) {
    const j = getJongsung(m[1])
    if (j === 0 || j === 4) {
      matches.push({
        index: m.index, length: m[0].length,
        original: m[0], suggestion: m[1] + '율',
        rule: '률→율 (모음/ㄴ 뒤)',
      })
    }
  }

  return matches
}

// --- 렬/열, 리/이 두음법칙 (선택적) ---
// 한자어에서 ㄹ→ㄴ/탈락: 녀→여, 뇨→요, 뉴→유, 니→이, 랴→야, 려→여, 례→예, 리→이, 류→유, 르→으
// 완전 자동화는 어려우므로 흔한 오류만

// --- 되/돼 판별 ---
function checkDoeDwae(text: string): TypoMatch[] {
  const matches: TypoMatch[] = []
  const patterns: [RegExp, string, string][] = [
    [/됬/g, '됐', '맞춤법 (됬→됐)'],
    [/되요/g, '돼요', '되/돼 (되요→돼요)'],
    [/되서(?=\s|$|[,.])/g, '돼서', '되/돼 (되서→돼서)'],
    [/되버/g, '돼버', '되/돼 (되버→돼버)'],
    [/되가지고/g, '돼가지고', '되/돼 (되→돼)'],
    [/되야/g, '돼야', '되/돼 (되야→돼야)'],
    [/안되요/g, '안 돼요', '되/돼 + 띄어쓰기'],
    [/안되겠/g, '안 되겠', '띄어쓰기'],
    [/안됬/g, '안 됐', '되/돼 + 띄어쓰기'],
    [/안됐/g, '안 됐', '띄어쓰기 (안 됐)'],
  ]
  for (const [re, sug, rule] of patterns) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const suggestion = m[0].replace(re, sug)
      if (suggestion !== m[0]) {
        matches.push({ index: m.index, length: m[0].length, original: m[0], suggestion, rule })
      }
    }
  }
  return matches
}

// ═══════════════════════════════════════════
// 2. 패턴 사전 (빈도 순 정리)
// ═══════════════════════════════════════════

type RuleEntry = [RegExp, string, string] // [pattern, suggestion, category]

const SPELLING: RuleEntry[] = [
  // ── 자주 틀리는 맞춤법 ──
  [/몇일/g, '며칠', '맞춤법'],
  [/갯수/g, '개수', '맞춤법'],
  [/댓가/g, '대가', '맞춤법'],
  [/잇점/g, '이점', '맞춤법'],
  [/곤난/g, '곤란', '맞춤법'],
  [/희안/g, '희한', '맞춤법'],
  [/금새/g, '금세', '맞춤법'],
  [/역활/g, '역할', '맞춤법'],
  [/설레임/g, '설렘', '맞춤법'],
  [/구지\b/g, '굳이', '맞춤법'],
  [/어떻해/g, '어떡해', '맞춤법'],
  [/어의없/g, '어이없', '맞춤법'],
  [/벌써/g, '', ''], // skip (correct)
  [/별써/g, '벌써', '맞춤법'],
  [/왠만/g, '웬만', '맞춤법'],
  [/웬지/g, '왠지', '맞춤법'],
  [/어떻게\s*됬/g, '어떻게 됐', '맞춤법'],
  [/어떻게\s*되\b/g, '어떻게 돼', '맞춤법'],
  [/일일히/g, '일일이', '맞춤법 (이/히)'],
  [/깨끗히/g, '깨끗이', '맞춤법 (이/히)'],
  [/깊숙히/g, '깊숙이', '맞춤법 (이/히)'],
  [/번번히/g, '번번이', '맞춤법 (이/히)'],
  [/틈틈히/g, '틈틈이', '맞춤법 (이/히)'],
  [/겹겹히/g, '겹겹이', '맞춤법 (이/히)'],
  [/간간히/g, '간간이', '맞춤법 (이/히)'],
  [/집집히/g, '집집이', '맞춤법 (이/히)'],
  [/오랫동안/g, '', ''], // correct, skip
  [/오랫만에/g, '오랜만에', '맞춤법'],
  [/어이가\s*없/g, '', ''], // correct, skip
  [/어의가\s*없/g, '어이가 없', '맞춤법'],
  [/담궈/g, '담가', '맞춤법 (담그다)'],
  [/잠궈/g, '잠가', '맞춤법 (잠그다)'],
  [/움추리/g, '움츠리', '맞춤법'],
  [/뒤치닥거리/g, '뒤치다꺼리', '맞춤법'],
  [/예기를/g, '얘기를', '맞춤법 (이야기)'],
  [/예기가/g, '얘기가', '맞춤법 (이야기)'],
  [/예기하/g, '얘기하', '맞춤법 (이야기)'],
  [/예기했/g, '얘기했', '맞춤법 (이야기)'],
  [/예기해/g, '얘기해', '맞춤법 (이야기)'],
  [/예기인/g, '얘기인', '맞춤법 (이야기)'],
  [/낳았/g, '', ''], // correct (출산), skip
  [/낳은/g, '', ''], // correct (출산), skip
  [/나았/g, '', ''], // correct (회복), skip
  [/않되/g, '안 되', '맞춤법 (않→안)'],
  [/않돼/g, '안 돼', '맞춤법 (않→안)'],
  [/하십시요/g, '하십시오', '맞춤법'],
  [/하겠읍니다/g, '하겠습니다', '맞춤법'],

  // ── ~ㄹ게/~ㄹ께 ──
  [/할께/g, '할게', '맞춤법 (께→게)'],
  [/올께/g, '올게', '맞춤법 (께→게)'],
  [/갈께/g, '갈게', '맞춤법 (께→게)'],
  [/볼께/g, '볼게', '맞춤법 (께→게)'],
  [/먹을께/g, '먹을게', '맞춤법 (께→게)'],
  [/해줄께/g, '해줄게', '맞춤법 (께→게)'],
  [/보낼께/g, '보낼게', '맞춤법 (께→게)'],
  [/할껄/g, '할걸', '맞춤법 (껄→걸)'],
  [/올껄/g, '올걸', '맞춤법 (껄→걸)'],
  [/갈껄/g, '갈걸', '맞춤법 (껄→걸)'],
  [/볼껄/g, '볼걸', '맞춤법 (껄→걸)'],
  [/먹을껄/g, '먹을걸', '맞춤법 (껄→걸)'],

  // ── 그 외 자주 틀리는 말 ──
  [/문안하/g, '', ''], // correct, skip
  [/무난히/g, '', ''], // correct, skip
  [/어쨋든/g, '어쨌든', '맞춤법'],
  [/어쨌든/g, '', ''], // correct
  [/어째든/g, '어쨌든', '맞춤법'],
  [/어쩃든/g, '어쨌든', '맞춤법'],
  [/가르치/g, '', ''], // correct (teach), skip
  [/가리키/g, '', ''], // correct (point), skip
  [/가르키/g, '가리키', '맞춤법 (가리키다)'], // 가르치다/가리키다 혼동
  [/바램/g, '바람', '맞춤법 (바라다→바람)'],
  [/설겆이/g, '설거지', '맞춤법'],
  [/그러므로써/g, '그럼으로써', '맞춤법'],
  [/그런즉슨/g, '그런즉', '맞춤법'],
  [/삼가해/g, '삼가', '맞춤법 (삼가다)'],
  [/삼가하/g, '삼가', '맞춤법 (삼가다)'],
  [/대게\b/g, '대개', '맞춤법'],
  [/어느새/g, '', ''], // correct
]

const SPACING: RuleEntry[] = [
  // ── 의존명사 띄어쓰기 ──
  [/할수있/g, '할 수 있', '띄어쓰기'],
  [/될수있/g, '될 수 있', '띄어쓰기'],
  [/할수없/g, '할 수 없', '띄어쓰기'],
  [/될수없/g, '될 수 없', '띄어쓰기'],
  [/할수록/g, '할수록', ''], // correct (붙여씀)
  [/할때/g, '할 때', '띄어쓰기'],
  [/될때/g, '될 때', '띄어쓰기'],
  [/올때/g, '올 때', '띄어쓰기'],
  [/갈때/g, '갈 때', '띄어쓰기'],
  [/했을때/g, '했을 때', '띄어쓰기'],
  [/봤을때/g, '봤을 때', '띄어쓰기'],
  [/있을때/g, '있을 때', '띄어쓰기'],
  [/없을때/g, '없을 때', '띄어쓰기'],
  [/됐을때/g, '됐을 때', '띄어쓰기'],
  [/왔을때/g, '왔을 때', '띄어쓰기'],
  [/났을때/g, '났을 때', '띄어쓰기'],
  [/같을때/g, '같을 때', '띄어쓰기'],
  [/할것/g, '할 것', '띄어쓰기'],
  [/될것/g, '될 것', '띄어쓰기'],
  [/할뿐/g, '할 뿐', '띄어쓰기'],
  [/할줄/g, '할 줄', '띄어쓰기'],
  [/할지/g, '할지', ''], // 어미 -ㄹ지 (붙여씀)
  [/안될/g, '안 될', '띄어쓰기'],
  [/못할/g, '못 할', '띄어쓰기'],
  [/안됨/g, '안 됨', '띄어쓰기'],
  [/못함/g, '못 함', '띄어쓰기'],
  [/어쩔수없/g, '어쩔 수 없', '띄어쓰기'],
  [/어쩔수/g, '어쩔 수', '띄어쓰기'],
  [/그럴수/g, '그럴 수', '띄어쓰기'],
  [/나올수/g, '나올 수', '띄어쓰기'],
  [/있을수/g, '있을 수', '띄어쓰기'],
  [/없을수/g, '없을 수', '띄어쓰기'],

  // ── 붙여쓰기 (한 단어) ──
  [/문의 사항/g, '문의사항', '붙여쓰기'],
]

const PASSIVE_REDUNDANT: RuleEntry[] = [
  // ── 이중 피동 ──
  [/되어지/g, '되', '이중 피동'],
  [/것으로 보여집니다/g, '것으로 보입니다', '이중 피동'],
  [/것으로 판단되어집니다/g, '것으로 판단됩니다', '이중 피동'],
  [/전망되어집니다/g, '전망됩니다', '이중 피동'],
  [/예상되어집니다/g, '예상됩니다', '이중 피동'],
  [/추정되어집니다/g, '추정됩니다', '이중 피동'],
  [/기대되어집니다/g, '기대됩니다', '이중 피동'],
  [/분석되어집니다/g, '분석됩니다', '이중 피동'],
  [/파악되어집니다/g, '파악됩니다', '이중 피동'],
  [/확인되어집니다/g, '확인됩니다', '이중 피동'],
  [/판단되어지/g, '판단되', '이중 피동'],
  [/예상되어지/g, '예상되', '이중 피동'],
  [/기대되어지/g, '기대되', '이중 피동'],
  [/추정되어지/g, '추정되', '이중 피동'],
  [/보여지고/g, '보이고', '이중 피동'],
  [/보여지는/g, '보이는', '이중 피동'],
  [/보여지며/g, '보이며', '이중 피동'],
  [/보여진다/g, '보인다', '이중 피동'],
  [/읽혀지/g, '읽히', '이중 피동'],
  [/잡혀지/g, '잡히', '이중 피동'],
  [/만들어지/g, '', ''], // correct, skip (만들다+어지다)
  [/쓰여지/g, '쓰이', '이중 피동'],
  [/불려지/g, '불리', '이중 피동'],
  [/풀려지/g, '풀리', '이중 피동'],

  // ── 군더더기 표현 ──
  [/상승세를 보이고 있/g, '상승하고 있', '군더더기 표현'],
  [/하락세를 보이고 있/g, '하락하고 있', '군더더기 표현'],
  [/증가세를 보이고 있/g, '증가하고 있', '군더더기 표현'],
  [/감소세를 보이고 있/g, '감소하고 있', '군더더기 표현'],
  [/개선세를 보이고 있/g, '개선되고 있', '군더더기 표현'],
]

const FOREIGN_WORDS: RuleEntry[] = [
  // ── 외래어 표기법 ──
  [/에널리스트/g, '애널리스트', '외래어 표기'],
  [/컨센선스/g, '컨센서스', '외래어 표기'],
  [/컨센써스/g, '컨센서스', '외래어 표기'],
  [/밸류에이숀/g, '밸류에이션', '외래어 표기'],
  [/밸류에이쎤/g, '밸류에이션', '외래어 표기'],
  [/포트폴리요/g, '포트폴리오', '외래어 표기'],
  [/시뮬레이숀/g, '시뮬레이션', '외래어 표기'],
  [/컨텐츠/g, '콘텐츠', '외래어 표기'],
  [/메세지/g, '메시지', '외래어 표기'],
  [/악세사리/g, '액세서리', '외래어 표기'],
  [/매니져/g, '매니저', '외래어 표기'],
  [/로보트/g, '로봇', '외래어 표기'],
  [/케잌/g, '케이크', '외래어 표기'],
  [/쥬스/g, '주스', '외래어 표기'],
  [/부페/g, '뷔페', '외래어 표기'],
  [/홧팅/g, '파이팅', '외래어 표기'],
  [/미싸일/g, '미사일', '외래어 표기'],
  [/프레젠테이숀/g, '프레젠테이션', '외래어 표기'],
  [/리더쉽/g, '리더십', '외래어 표기'],
  [/멤버쉽/g, '멤버십', '외래어 표기'],
  [/파트너쉽/g, '파트너십', '외래어 표기'],
  [/스폰서쉽/g, '스폰서십', '외래어 표기'],
  [/펀딩/g, '', ''], // correct
  [/알고리듬/g, '알고리즘', '외래어 표기'],
  [/플랫홈/g, '플랫폼', '외래어 표기'],
  [/컴플라이언스/g, '', ''], // correct
  [/워런트/g, '', ''], // correct
  [/인플레이숀/g, '인플레이션', '외래어 표기'],
  [/디플레이숀/g, '디플레이션', '외래어 표기'],
  [/스태그플레이숀/g, '스태그플레이션', '외래어 표기'],
]

const SECURITIES: RuleEntry[] = [
  // ── 증권·금융 특화 ──
  [/목표주까/g, '목표주가', '오타'],
  [/영업이이익/g, '영업이익', '오타 (중복)'],
  [/당기순이이익/g, '당기순이익', '오타 (중복)'],
  [/점유율율/g, '점유율', '중복'],
  [/효율율/g, '효율', '중복'],
  [/비율율/g, '비율', '중복'],
  [/(\d)억원원/g, '$1억원', '중복 단위'],
  [/(\d)조원원/g, '$1조원', '중복 단위'],
  [/퍼센트%/g, '%', '중복 단위'],
]

// ═══════════════════════════════════════════
// 3. 조사 오류 감지
// ═══════════════════════════════════════════

// 은/는, 이/가, 을/를, 과/와, 으로/로 — 받침 유무에 따른 조사 선택
function checkParticles(text: string): TypoMatch[] {
  const matches: TypoMatch[] = []

  // 조사 검사는 오탐이 많으므로 명확한 패턴만 잡음
  // 예: "것는" → "것은", "점를" → "점을"
  const clearPatterns: [RegExp, string, string][] = [
    [/것는/g, '것은', '조사 (것+은)'],
    [/것가/g, '것이', '조사 (것+이)'],
    [/점를/g, '점을', '조사 (점+을)'],
    [/원는/g, '원은', '조사 (원+은)'],
    [/일를/g, '일을', '조사 (일+을)'],
    [/달는/g, '달은', '조사 (달+은)'],
    [/건를/g, '건을', '조사 (건+을)'],
    [/분는/g, '분은', '조사 (분+은)'],
    [/년는/g, '년은', '조사 (년+은)'],
  ]

  for (const [re, sug, rule] of clearPatterns) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      matches.push({ index: m.index, length: m[0].length, original: m[0], suggestion: sug, rule })
    }
  }

  return matches
}

// ═══════════════════════════════════════════
// 4. 연속 글자 / 오타 패턴
// ═══════════════════════════════════════════

function checkRepeatedChars(text: string): TypoMatch[] {
  const matches: TypoMatch[] = []

  // 같은 한글 글자 3회 이상 반복 (예: 하하하하 → skip, ㅋㅋㅋ → skip 채팅체)
  // 같은 단어 연속 반복 (예: "있는 있는" → "있는")
  const wordRepeatRe = /(\S{2,})\s+\1(?=\s|$|[,.])/g
  let m: RegExpExecArray | null
  while ((m = wordRepeatRe.exec(text)) !== null) {
    matches.push({
      index: m.index, length: m[0].length,
      original: m[0], suggestion: m[1],
      rule: '단어 중복',
    })
  }

  return matches
}

// ═══════════════════════════════════════════
// 메인 검사 함수
// ═══════════════════════════════════════════

function applyRuleList(text: string, rules: RuleEntry[]): TypoMatch[] {
  const matches: TypoMatch[] = []
  for (const [pattern, suggestion, rule] of rules) {
    if (!rule) continue
    // 매번 새 RegExp 생성으로 lastIndex 문제 방지
    const re = new RegExp(pattern.source, pattern.flags)
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const replaced = m[0].replace(new RegExp(pattern.source, pattern.flags), suggestion)
      if (replaced !== m[0]) {
        matches.push({
          index: m.index, length: m[0].length,
          original: m[0], suggestion: replaced, rule,
        })
      }
      // 길이 0 매치 무한루프 방지
      if (m[0].length === 0) re.lastIndex++
    }
  }
  return matches
}

export function checkTypos(text: string): TypoMatch[] {
  if (!text.trim()) return []

  const allMatches: TypoMatch[] = []

  // 체계적 규칙
  allMatches.push(...checkYulRyul(text))
  allMatches.push(...checkDoeDwae(text))
  allMatches.push(...checkParticles(text))
  allMatches.push(...checkRepeatedChars(text))

  // 패턴 사전
  allMatches.push(...applyRuleList(text, SPELLING))
  allMatches.push(...applyRuleList(text, SPACING))
  allMatches.push(...applyRuleList(text, PASSIVE_REDUNDANT))
  allMatches.push(...applyRuleList(text, FOREIGN_WORDS))
  allMatches.push(...applyRuleList(text, SECURITIES))

  // 중복 제거 (같은 위치에 여러 규칙이 걸린 경우 첫 번째만)
  const seen = new Set<string>()
  const deduped = allMatches
    .sort((a, b) => a.index - b.index)
    .filter((m) => {
      const key = `${m.index}:${m.length}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  // 겹치는 범위 제거 (앞선 매치 우선)
  const result: TypoMatch[] = []
  let lastEnd = -1
  for (const m of deduped) {
    if (m.index >= lastEnd) {
      result.push(m)
      lastEnd = m.index + m.length
    }
  }

  return result
}
