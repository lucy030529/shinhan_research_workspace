// 신한투자증권 리서치 리포트 크롤링
// GET /api/shinhan-research?page=1&pageSize=20&boardName=gistock

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
  const page = url.searchParams.get('page') || '1'
  const pageSize = url.searchParams.get('pageSize') || '20'
  const boardName = url.searchParams.get('boardName') || '' // gistock, gicomment, foreignstock 등
  const keyword = url.searchParams.get('keyword') || ''

  try {
    const params = new URLSearchParams({
      page,
      pageSize,
    })
    if (boardName) params.set('boardName', boardName)
    if (keyword) params.set('query', keyword)

    const resp = await fetch('https://www.shinhansec.com/siw/etc/browse/search05/data.do', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.shinhansec.com/siw/insights/research/list/view-popup.do',
      },
      body: params.toString(),
    })

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `신한 리서치 API 오류: ${resp.status}` }), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await resp.json()
    const collection = data.body?.collectionList?.[0]
    const rawItems = collection?.itemList || []
    const total = collection?.thisTotalCount || 0

    const items = rawItems.map((item: Record<string, string>) => {
      const boardName2 = item.BOARD_NAME || ''
      const docId = item.DOCID || item.MESSAGE_ID || ''
      const viewUrl = boardName2 && docId
        ? `https://www.shinhansec.com/siw/board/message/view.file.pop.do?boardName=${boardName2}&messageId=${docId}`
        : ''

      return {
        id: docId,
        title: item.TITLE || '',
        analyst: item.REGISTER_NICKNAME || '',
        category: item.BOARD_TITLE || item.VARIABLE_FIELD_NAME3 || '',
        boardName: boardName2,
        company: item.VARIABLE_FIELD_NAME1 || item.VARIABLE_FIELD_NAME2 || '',
        date: item.DATE || '',
        pdfUrl: viewUrl,
      }
    })

    return new Response(JSON.stringify({ items, total, fetchedAt: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: `신한 리서치 조회 실패: ${e instanceof Error ? e.message : String(e)}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/api/shinhan-research' }
