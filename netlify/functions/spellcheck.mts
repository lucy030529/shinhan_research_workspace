// 네이버 맞춤법 검사기 프록시
// PNU 맞춤법 검사기 (부산대 맞춤법 검사기) API 활용

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
    // 네이버 맞춤법 검사기 API
    const passportKey = '90bc1e5f53c24891b33e20ff1fa4ae38'
    const resp = await fetch(
      `https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy?passportKey=${passportKey}&q=${encodeURIComponent(text)}&where=nexearch&color_blindness=0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://search.naver.com/',
        },
      },
    )

    const data = await resp.json()
    const message = data?.message?.result
    if (!message) {
      return jsonResponse({ results: [], html: '' })
    }

    // 네이버 API는 html 형태로 교정 결과를 반환
    const html: string = message.notag_html || ''
    const errata: string = message.errata_count || '0'
    const origin: string = message.origin_html || ''

    // HTML에서 교정 항목 추출
    const results: SpellResult[] = []
    // 네이버 API는 <span class="red/green/blue/purple_text">교정어</span> 형태
    const tagRegex = /<span class="(?:red|green|blue|purple)_text">([^<]+)<\/span>/g
    let tagMatch
    const corrections: { corrected: string; type: string }[] = []

    const originClean = origin.replace(/<[^>]+>/g, '')
    const htmlClean = html

    // 원문과 교정문을 비교하여 차이 추출
    if (originClean !== htmlClean && parseInt(errata) > 0) {
      // 단어별 비교
      const origWords = originClean.split(/(\s+)/)
      const corrWords = htmlClean.split(/(\s+)/)
      let origPos = 0

      for (let i = 0; i < origWords.length; i++) {
        const ow = origWords[i]
        const cw = corrWords[i] || ''

        if (ow !== cw && ow.trim()) {
          results.push({
            original: ow,
            suggestion: cw,
            info: '맞춤법/띄어쓰기',
            start: origPos,
            end: origPos + ow.length,
          })
        }
        origPos += ow.length
      }
    }

    return jsonResponse({ results, html: htmlClean, errataCount: parseInt(errata) })
  } catch (e) {
    return jsonResponse({ error: String(e), results: [] }, 500)
  }
}
