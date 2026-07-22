import { getStore } from '@netlify/blobs'

interface CalendarEvent {
  id: string
  date: string
  endDate?: string
  title: string
  color: 'blue' | 'red' | 'green' | 'amber' | 'purple' | 'cyan'
  analyst?: string
  time?: string
  createdBy?: string
  isDepartment?: boolean
  createdAt: string
}

const STORE_NAME = 'calendar'
const BLOB_KEY = 'events'

async function getEvents(): Promise<CalendarEvent[]> {
  const store = getStore(STORE_NAME)
  const data = await store.get(BLOB_KEY)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveEvents(events: CalendarEvent[]) {
  const store = getStore(STORE_NAME)
  await store.set(BLOB_KEY, JSON.stringify(events))
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async function handler(req: Request) {
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  // GET: list events
  if (req.method === 'GET' && (!action || action === 'list')) {
    const events = await getEvents()
    return jsonResponse({ events })
  }

  // POST: add event
  if (req.method === 'POST' && action === 'add') {
    const body = await req.json()
    const events = await getEvents()
    const newEvent: CalendarEvent = {
      id: 'ev' + Date.now() + Math.random().toString(36).slice(2, 6),
      date: body.date,
      ...(body.endDate ? { endDate: body.endDate } : {}),
      title: body.title,
      color: body.color || 'blue',
      analyst: body.analyst,
      time: body.time,
      createdBy: body.createdBy,
      ...(body.isDepartment ? { isDepartment: true } : {}),
      createdAt: new Date().toISOString(),
    }
    events.push(newEvent)
    await saveEvents(events)
    return jsonResponse({ ok: true, event: newEvent })
  }

  // POST: remove event
  if (req.method === 'POST' && action === 'remove') {
    const body = await req.json()
    const events = await getEvents()
    const filtered = events.filter((e) => e.id !== body.id)
    await saveEvents(filtered)
    return jsonResponse({ ok: true })
  }

  // POST: update event
  if (req.method === 'POST' && action === 'update') {
    const body = await req.json()
    const events = await getEvents()
    const idx = events.findIndex((e) => e.id === body.id)
    if (idx >= 0) {
      events[idx] = { ...events[idx], ...body.patch }
      await saveEvents(events)
    }
    return jsonResponse({ ok: true })
  }

  return jsonResponse({ error: 'Not found' }, 404)
}
