// DART 공시 조회 API
// GET /api/dart?corp_code=00126380&count=10
// GET /api/dart?corp_name=삼성전자&count=10

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

  const apiKey = process.env.DART_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DART API 키가 설정되지 않았습니다. DART_API_KEY 환경변수를 설정해주세요.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const corpCode = url.searchParams.get('corp_code') || ''
  const stockCode = url.searchParams.get('stock_code') || ''
  const count = url.searchParams.get('count') || '20'
  const type = url.searchParams.get('type') || '' // A:정기공시, B:주요사항, C:발행공시, D:지분공시, E:기타공시

  try {
    // 최근 공시 목록 조회
    const params = new URLSearchParams({
      crtfc_key: apiKey,
      page_count: count,
    })

    if (corpCode) params.set('corp_code', corpCode)
    if (stockCode) params.set('stock_code', stockCode)
    if (type) params.set('pblntf_ty', type)

    // 최근 3개월 범위
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 3)
    params.set('bgn_de', start.toISOString().slice(0, 10).replace(/-/g, ''))
    params.set('end_de', end.toISOString().slice(0, 10).replace(/-/g, ''))

    const dartUrl = `https://opendart.fss.or.kr/api/list.json?${params}`
    const resp = await fetch(dartUrl)

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `DART API 오류: ${resp.status}` }), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await resp.json()

    if (data.status !== '000') {
      return new Response(JSON.stringify({ error: `DART: ${data.message || '조회 결과 없음'}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const items = (data.list || []).map((item: { rcept_no: string; corp_name: string; stock_code: string; report_nm: string; rcept_dt: string; flr_nm: string }) => ({
      id: item.rcept_no,
      title: item.report_nm,
      companyName: item.corp_name,
      ticker: item.stock_code,
      date: `${item.rcept_dt.slice(0, 4)}-${item.rcept_dt.slice(4, 6)}-${item.rcept_dt.slice(6, 8)}`,
      filer: item.flr_nm,
      url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
    }))

    return new Response(JSON.stringify({ items, total: data.total_count, fetchedAt: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: `DART 조회 실패: ${e instanceof Error ? e.message : String(e)}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/api/dart' }
