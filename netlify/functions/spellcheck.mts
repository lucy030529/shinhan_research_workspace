// 한국어 맞춤법 검사 프록시
// 1차: 네이버 맞춤법 검사기 (동적 passportKey)
// 2차: 부산대학교 맞춤법 검사기 (fallback)

interface SpellResult {
  original: string
  suggestion: string
  info: string
  start: number
  end: number
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const TYPE_LABELS: Record<string, string> = {
  red: '맞춤법',
  green: '띄어쓰기',
  blue: '표준어 의심',
  purple: '통계적 교정',
}

const CORRECT_METHOD_LABELS: Record<number, string> = {
  1: '맞춤법',
  2: '띄어쓰기',
  3: '표준어 의심',
  4: '통계적 교정',
}

// ─── 네이버 맞춤법 검사기 ───

let cachedNaverKey: string | null = null
let keyFetchedAt = 0

async function getNaverPassportKey(): Promise<string> {
  const DEFAULT_KEY = '90bc1e5f53c24891b33e20ff1fa4ae38'
  // 캐시된 키가 10분 이내면 재사용
  if (cachedNaverKey && Date.now() - keyFetchedAt < 600_000) {
    return cachedNaverKey
  }
  try {
    const resp = await fetch(
      'https://search.naver.com/search.naver?where=nexearch&query=%EB%A7%9E%EC%B6%A4%EB%B2%95%EA%B2%80%EC%82%AC%EA%B8%B0',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    )
    const html = await resp.text()
    const match =
      html.match(/passportKey=([a-f0-9]{32})/) ||
      html.match(/passportKey%3D([a-f0-9]{32})/) ||
      html.match(/"passportKey":"([a-f0-9]{32})"/)
    if (match?.[1]) {
      cachedNaverKey = match[1]
      keyFetchedAt = Date.now()
      return cachedNaverKey
    }
  } catch {
    // ignore
  }
  return DEFAULT_KEY
}

function parseNaverSpans(originHtml: string, corrHtml: string, originalText: string): SpellResult[] {
  const results: SpellResult[] = []
  const spanRegex = /<span class="(\w+)_text">([^<]*)<\/span>/g

  const origErrors: { text: string; type: string }[] = []
  const corrFixes: string[] = []

  let m: RegExpExecArray | null
  while ((m = spanRegex.exec(originHtml)) !== null) {
    origErrors.push({ text: m[2], type: m[1] })
  }
  spanRegex.lastIndex = 0
  while ((m = spanRegex.exec(corrHtml)) !== null) {
    corrFixes.push(m[2])
  }

  let searchFrom = 0
  for (let i = 0; i < origErrors.length; i++) {
    const orig = origErrors[i].text
    const fix = corrFixes[i] ?? orig
    if (orig === fix) continue

    const pos = originalText.indexOf(orig, searchFrom)
    if (pos === -1) continue

    results.push({
      original: orig,
      suggestion: fix,
      info: TYPE_LABELS[origErrors[i].type] || '맞춤법',
      start: pos,
      end: pos + orig.length,
    })
    searchFrom = pos + orig.length
  }
  return results
}

async function checkNaver(text: string): Promise<{ results: SpellResult[]; ok: boolean }> {
  try {
    const key = await getNaverPassportKey()
    const resp = await fetch(
      `https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy?passportKey=${key}&q=${encodeURIComponent(text)}&where=nexearch&color_blindness=0`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://search.naver.com/',
        },
      },
    )

    if (!resp.ok) return { results: [], ok: false }

    const data = await resp.json()
    const message = data?.message?.result
    if (!message) return { results: [], ok: false }

    const errata = parseInt(message.errata_count || '0', 10)
    if (errata === 0) return { results: [], ok: true }

    const originHtml: string = message.origin_html || ''
    const corrHtml: string = message.html || ''

    if (!originHtml || !corrHtml) return { results: [], ok: false }

    const results = parseNaverSpans(originHtml, corrHtml, text)
    return { results, ok: true }
  } catch {
    return { results: [], ok: false }
  }
}

// ─── 부산대학교 맞춤법 검사기 (PNU) ───

interface PNUErrInfo {
  help: string
  errorIdx: number
  correctMethod: number
  orgStr: string
  candWord: string
  start: number
  end: number
}

async function checkPNU(text: string): Promise<{ results: SpellResult[]; ok: boolean }> {
  try {
    const resp = await fetch('http://speller.cs.pusan.ac.kr/results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: `text1=${encodeURIComponent(text)}`,
    })

    if (!resp.ok) return { results: [], ok: false }

    const html = await resp.text()

    // HTML 응답에서 data = [...] 추출
    const dataMatch = html.match(/data\s*=\s*(\[[\s\S]*?\]);/)
    if (!dataMatch) return { results: [], ok: false }

    let parsed: { str: string; errInfo: PNUErrInfo[]; idx: number }[]
    try {
      parsed = JSON.parse(dataMatch[1])
    } catch {
      return { results: [], ok: false }
    }

    const results: SpellResult[] = []
    let globalOffset = 0

    for (const page of parsed) {
      if (!page.errInfo) continue
      for (const err of page.errInfo) {
        const suggestion = err.candWord.split('|')[0] // 첫 번째 교정 후보
        if (!suggestion || suggestion === err.orgStr) continue

        results.push({
          original: err.orgStr,
          suggestion,
          info: CORRECT_METHOD_LABELS[err.correctMethod] || '맞춤법',
          start: globalOffset + err.start,
          end: globalOffset + err.end,
        })
      }
      globalOffset += page.str.length
    }

    return { results, ok: true }
  } catch {
    return { results: [], ok: false }
  }
}

// ─── 핸들러 ───

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const body = await req.json()
  const text: string = body.text || ''

  if (!text.trim()) {
    return jsonResponse({ results: [], source: 'none' })
  }

  // 1차: 네이버
  const naver = await checkNaver(text)
  if (naver.ok && naver.results.length > 0) {
    return jsonResponse({ results: naver.results, source: 'naver', count: naver.results.length })
  }

  // 2차: 부산대 (네이버 실패 또는 결과 없음)
  const pnu = await checkPNU(text)
  if (pnu.ok) {
    return jsonResponse({ results: pnu.results, source: 'pnu', count: pnu.results.length })
  }

  // 네이버가 ok였지만 결과가 0건인 경우 (오타 없음)
  if (naver.ok) {
    return jsonResponse({ results: [], source: 'naver', count: 0 })
  }

  // 둘 다 실패
  return jsonResponse({ results: [], source: 'failed', error: '맞춤법 API 연결 실패' })
}
