// AI 레포트 생성 — Claude API 스트리밍 호출
// Netlify Function(/api/generate)을 통해 Anthropic API 호출

import { SYSTEM_PROMPTS, USER_MSG_SUFFIXES, type ReportType } from '../data/reportPrompts'

export interface GenerateInput {
  reportType: ReportType
  company: string
  quarter: string
  pubDate: string
  scriptText: string
  fileTexts: string[]
  extraNotes: string
}

function formatDateKr(dateStr: string): string {
  if (!dateStr) {
    const d = new Date()
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
  }
  const [y, m, d] = dateStr.split('-')
  return `${Number(y)}년 ${Number(m)}월 ${Number(d)}일`
}

export function buildPrompt(input: GenerateInput): { system: string; user: string } {
  const system = SYSTEM_PROMPTS[input.reportType]

  const parts: string[] = []
  if (input.reportType !== 'qa' && input.pubDate) {
    parts.push(`발간일: ${formatDateKr(input.pubDate)}`)
  }
  if (input.company) parts.push(`기업명: ${input.company}`)
  if (input.quarter) parts.push(`분기: ${input.quarter}`)
  if (input.scriptText) parts.push(`## 실적발표 스크립트\n${input.scriptText}`)
  for (const ft of input.fileTexts) parts.push(ft)
  if (input.extraNotes) parts.push(`## 추가 메모\n${input.extraNotes}`)

  const user = parts.join('\n\n') + '\n\n' + USER_MSG_SUFFIXES[input.reportType]
    + '\n\n[필수] 최종 산출물(레포트 본문)만 출력하라. 작업 설명, 서론, 메타코멘트("~하겠습니다", "~분석하겠습니다", "파일이 없지만" 등)를 절대 포함하지 말 것. 첫 글자부터 바로 레포트 내용을 시작하라.'

  return { system, user }
}

// API 키 localStorage 관리
const API_KEY_STORAGE = 'shinhan_anthropic_api_key'

export function getStoredApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) || ''
}

export function setStoredApiKey(key: string) {
  if (key) {
    localStorage.setItem(API_KEY_STORAGE, key)
  } else {
    localStorage.removeItem(API_KEY_STORAGE)
  }
}

// 스트리밍 레포트 생성
export async function generateReport(
  input: GenerateInput,
  onChunk: (fullText: string) => void,
): Promise<string> {
  const { system, user } = buildPrompt(input)
  const apiKey = getStoredApiKey()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  const resp = await fetch('/api/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ systemPrompt: system, userMessage: user }),
  })

  if (!resp.ok) {
    let errorMsg = `서버 오류 (${resp.status})`
    try {
      const err = await resp.json()
      errorMsg = err.error || errorMsg
    } catch { /* ignore */ }
    throw new Error(errorMsg)
  }

  if (!resp.body) {
    throw new Error('스트리밍 응답을 받을 수 없습니다.')
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop()!

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6))
        if (data.error) throw new Error(data.error)
        if (data.done) break
        if (data.text) {
          fullText += data.text
          onChunk(fullText)
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }

  return fullText
}
