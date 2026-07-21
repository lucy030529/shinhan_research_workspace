// Netlify Function v2 — Claude API 스트리밍 호출
// ANTHROPIC_API_KEY: Netlify 환경변수 또는 클라이언트 헤더(x-api-key)로 전달

import Anthropic from '@anthropic-ai/sdk'

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // API 키: 환경변수 우선, 없으면 클라이언트 헤더
  const apiKey = process.env.ANTHROPIC_API_KEY || req.headers.get('x-api-key')
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API 키가 설정되지 않았습니다. 설정에서 Anthropic API 키를 입력해주세요.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let body: { systemPrompt: string; userMessage: string }
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: '잘못된 요청 형식입니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { systemPrompt, userMessage } = body
  if (!systemPrompt || !userMessage) {
    return new Response(
      JSON.stringify({ error: '시스템 프롬프트와 사용자 메시지가 필요합니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const client = new Anthropic({ apiKey })
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 8000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          stream: true,
        })

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const payload = JSON.stringify({ text: event.delta.text })
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
        )
        controller.close()
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: msg })}\n\n`,
          ),
        )
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export const config = {
  path: '/api/generate',
}
