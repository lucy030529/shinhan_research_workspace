// 네이버 뉴스 검색 API
// GET /api/news?query=삼성전자&count=10

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const url = new URL(req.url)
  const query = url.searchParams.get('query')
  const count = url.searchParams.get('count') || '10'

  if (!query) {
    return new Response(JSON.stringify({ error: '검색어(query)를 입력해주세요.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 네이버 검색 API (Client ID/Secret 필요)
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: '네이버 API 키가 설정되지 않았습니다. NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 환경변수를 설정해주세요.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const naverUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${count}&sort=date`
    const resp = await fetch(naverUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return new Response(JSON.stringify({ error: `네이버 API 오류: ${resp.status} ${errText}` }), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await resp.json()
    const items = (data.items || []).map((item: { title: string; link: string; description: string; pubDate: string; originallink: string }) => ({
      title: item.title.replace(/<[^>]*>/g, ''),
      link: item.originallink || item.link,
      description: item.description.replace(/<[^>]*>/g, ''),
      pubDate: item.pubDate,
      source: new URL(item.originallink || item.link).hostname.replace('www.', ''),
    }))

    return new Response(JSON.stringify({ items, total: data.total, fetchedAt: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: `뉴스 검색 실패: ${e instanceof Error ? e.message : String(e)}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/api/news' }
