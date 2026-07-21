// 로컬 서버 — claude -p CLI를 통해 구독 크레딧으로 레포트 생성
// 사용법: node server.mjs → http://localhost:3001

import { createServer } from 'http'
import { spawn } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

const PORT = 3001

const server = createServer(async (req, res) => {
  // CORS (Vite dev 서버에서 호출 허용)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/api/generate') {
    let body = ''
    for await (const chunk of req) body += chunk

    let parsed
    try {
      parsed = JSON.parse(body)
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '잘못된 요청 형식' }))
      return
    }

    const { systemPrompt, userMessage } = parsed
    if (!systemPrompt || !userMessage) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '프롬프트가 비어있습니다.' }))
      return
    }

    const fullPrompt = `${systemPrompt}\n\n---\n\n${userMessage}`

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    console.log(`[생성 시작] ${new Date().toLocaleTimeString()} | 프롬프트 ${fullPrompt.length}자`)

    // claude -p 호출 (구독 크레딧 사용)
    // CLAUDECODE 환경변수 제거 — 중첩 세션 방지 우회
    const env = { ...process.env }
    delete env.CLAUDECODE
    env.LANG = 'en_US.UTF-8'
    env.LC_ALL = 'en_US.UTF-8'

    const proc = spawn('claude', ['-p'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env,
    })

    proc.stdin.write(fullPrompt)
    proc.stdin.end()

    proc.stdout.on('data', (data) => {
      const text = data.toString('utf-8')
      res.write(`data: ${JSON.stringify({ text })}\n\n`)
    })

    proc.stderr.on('data', (data) => {
      console.error(`[claude stderr] ${data.toString('utf-8')}`)
    })

    proc.on('close', (code) => {
      console.log(`[생성 완료] exit code: ${code}`)
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
      res.end()
    })

    proc.on('error', (err) => {
      console.error(`[오류] ${err.message}`)
      res.write(`data: ${JSON.stringify({ error: `claude CLI 실행 실패: ${err.message}` })}\n\n`)
      res.end()
    })
  } else if (req.method === 'POST' && req.url === '/api/download-docx') {
    // 신한 템플릿 기반 DOCX 생성 (Python 스크립트 호출)
    let body = ''
    for await (const chunk of req) body += chunk

    let parsed
    try {
      parsed = JSON.parse(body)
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '잘못된 요청 형식' }))
      return
    }

    const { markdown, reportType, company, pubDate } = parsed
    if (!markdown) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '마크다운 내용이 비어있습니다.' }))
      return
    }

    const outputFile = join(tmpdir(), `report-${randomUUID()}.docx`)
    const scriptPath = join(process.cwd(), 'scripts', 'build_docx.py')

    console.log(`[DOCX 생성] ${reportType} | ${company}`)

    const proc = spawn('python', [
      scriptPath,
      '--type', reportType || 'qa',
      '--company', company || '레포트',
      '--date', pubDate || '',
      '--output', outputFile,
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    })

    proc.stdin.write(markdown)
    proc.stdin.end()

    let stderr = ''
    proc.stderr.on('data', (data) => { stderr += data.toString('utf-8') })

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`[DOCX 오류] ${stderr}`)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `DOCX 생성 실패: ${stderr}` }))
        return
      }

      try {
        const docxBuf = readFileSync(outputFile)
        const typeLabels = { qa: 'QA', sokbo: '속보', review: '실적리뷰', overseas: '해외기업', note: '컨콜노트' }
        const fname = `${company || '레포트'}_${typeLabels[reportType] || ''}.docx`.replace(/\s+/g, '_')

        res.writeHead(200, {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fname)}"`,
          'Content-Length': docxBuf.length,
        })
        res.end(docxBuf)
        unlinkSync(outputFile)
        console.log(`[DOCX 완료] ${fname}`)
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `파일 읽기 실패: ${e.message}` }))
      }
    })
  } else if (req.method === 'POST' && req.url === '/api/download-pdf') {
    // 컨콜 노트 PDF 생성
    let body = ''
    for await (const chunk of req) body += chunk

    let parsed
    try {
      parsed = JSON.parse(body)
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '잘못된 요청 형식' }))
      return
    }

    const { markdown, company } = parsed
    if (!markdown) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '마크다운 내용이 비어있습니다.' }))
      return
    }

    const outputFile = join(tmpdir(), `note-${randomUUID()}.pdf`)
    const scriptPath = join(process.cwd(), 'scripts', 'build_docx.py')

    console.log(`[PDF 생성] 컨콜노트 | ${company}`)

    const proc = spawn('python', [
      scriptPath,
      '--type', 'note',
      '--company', company || '레포트',
      '--format', 'pdf',
      '--output', outputFile,
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    })

    proc.stdin.write(markdown)
    proc.stdin.end()

    let stderr = ''
    proc.stderr.on('data', (data) => { stderr += data.toString('utf-8') })

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`[PDF 오류] ${stderr}`)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `PDF 생성 실패: ${stderr}` }))
        return
      }

      try {
        const pdfBuf = readFileSync(outputFile)
        const fname = `${company || '레포트'}_컨콜노트.pdf`.replace(/\s+/g, '_')

        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fname)}"`,
          'Content-Length': pdfBuf.length,
        })
        res.end(pdfBuf)
        unlinkSync(outputFile)
        console.log(`[PDF 완료] ${fname}`)
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `파일 읽기 실패: ${e.message}` }))
      }
    })
  } else if (req.method === 'GET' && req.url?.startsWith('/api/stock-price')) {
    // 네이버 증권 주가 조회 프록시
    const u = new URL(req.url, `http://localhost:${PORT}`)
    const tickers = u.searchParams.get('tickers')
    if (!tickers) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '종목코드(tickers)를 입력해주세요.' }))
      return
    }

    const codes = tickers.split(',').map(t => t.trim()).filter(Boolean)
    const results = []

    for (const code of codes) {
      try {
        const apiResp = await fetch(
          `https://m.stock.naver.com/api/stock/${code}/basic`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } },
        )
        if (!apiResp.ok) continue
        const data = await apiResp.json()
        results.push({
          ticker: code,
          name: data.stockName || code,
          currentPrice: parseInt(String(data.stockEndPrice || data.closePrice || '0').replace(/,/g, ''), 10) || 0,
          change: parseInt(String(data.compareToPreviousClosePrice || '0').replace(/,/g, ''), 10) || 0,
          changePercent: parseFloat(data.fluctuationsRatio || '0') || 0,
          volume: parseInt(String(data.accumulatedTradingVolume || '0').replace(/,/g, ''), 10) || 0,
        })
      } catch { /* skip */ }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ prices: results, fetchedAt: new Date().toISOString() }))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not Found' }))
  }
})

server.listen(PORT, () => {
  console.log(``)
  console.log(`  신한 레포트 로컬 서버`)
  console.log(`  http://localhost:${PORT}`)
  console.log(`  claude -p CLI → 구독 크레딧 사용`)
  console.log(``)
  console.log(`  npm run dev 실행 후 http://localhost:5173/reports 에서 사용`)
  console.log(``)
})
