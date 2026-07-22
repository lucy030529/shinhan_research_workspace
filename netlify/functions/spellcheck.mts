// 네이버 맞춤법 검사기 프록시
// origin_html / html 의 <span> 태그를 파싱하여 원문↔교정 쌍을 추출

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

// HTML에서 <span class="xxx_text">내용</span> 태그를 추출
function extractSpans(html: string): { text: string; type?: string }[] {
  const parts: { text: string; type?: string }[] = []
  const regex = /<span class="(\w+)_text">([^<]*)<\/span>/g
  let lastIndex = 0
  let m: RegExpExecArray | null

  while ((m = regex.exec(html)) !== null) {
    if (m.index > lastIndex) {
      const plain = html.slice(lastIndex, m.index).replace(/<[^>]+>/g, '')
      if (plain) parts.push({ text: plain })
    }
    parts.push({ text: m[2], type: m[1] })
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < html.length) {
    const plain = html.slice(lastIndex).replace(/<[^>]+>/g, '')
    if (plain) parts.push({ text: plain })
  }
  return parts
}

function parseCorrections(originHtml: string, corrHtml: string, originalText: string): SpellResult[] {
  const results: SpellResult[] = []

  const origParts = extractSpans(originHtml)
  const corrParts = extractSpans(corrHtml)

  // span이 있는 부분만 추출 (순서대로 1:1 대응)
  const origErrors = origParts.filter((p) => p.type)
  const corrFixes = corrParts.filter((p) => p.type)

  let searchFrom = 0
  for (let i = 0; i < origErrors.length; i++) {
    const orig = origErrors[i].text
    const fix = corrFixes[i]?.text ?? orig
    const errType = origErrors[i].type || 'red'

    if (orig === fix) continue

    const pos = originalText.indexOf(orig, searchFrom)
    if (pos === -1) continue

    results.push({
      original: orig,
      suggestion: fix,
      info: TYPE_LABELS[errType] || '맞춤법',
      start: pos,
      end: pos + orig.length,
    })
    searchFrom = pos + orig.length
  }

  return results
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const body = await req.json()
  const text: string = body.text || ''

  if (!text.trim()) {
    return jsonResponse({ results: [] })
  }

  try {
    const passportKey = '90bc1e5f53c24891b33e20ff1fa4ae38'
    const resp = await fetch(
      `https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy?passportKey=${passportKey}&q=${encodeURIComponent(text)}&where=nexearch&color_blindness=0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://search.naver.com/',
        },
      },
    )

    const data = await resp.json()
    const message = data?.message?.result
    if (!message) {
      return jsonResponse({ results: [], raw: data })
    }

    const originHtml: string = message.origin_html || ''
    const corrHtml: string = message.html || ''
    const notag: string = message.notag_html || ''
    const errata: number = parseInt(message.errata_count || '0', 10)

    let results: SpellResult[] = []

    if (errata > 0 && originHtml && corrHtml) {
      results = parseCorrections(originHtml, corrHtml, text)
    }

    return jsonResponse({ results, corrected: notag, errataCount: errata })
  } catch (e) {
    return jsonResponse({ error: String(e), results: [] }, 500)
  }
}
