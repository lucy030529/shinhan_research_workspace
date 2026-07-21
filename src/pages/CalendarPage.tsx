import { useState } from 'react'
import { Button, Card, PageHeader } from '../components/ui'
import { useCalendar, type CalendarEvent } from '../store/calendar'

const COLORS: CalendarEvent['color'][] = ['blue', 'red', 'green', 'amber', 'purple']
const COLOR_CLASSES: Record<CalendarEvent['color'], string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
}
const COLOR_BG: Record<CalendarEvent['color'], string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
}
const COLOR_LABEL: Record<CalendarEvent['color'], string> = {
  blue: '실적',
  red: '마감',
  green: '미팅',
  amber: '콥데이',
  purple: '기타',
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()

  const cells: { date: string; day: number; isCurrentMonth: boolean }[] = []

  // 이전 달
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDays - i
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year
    cells.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false })
  }

  // 이번 달
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      day: d,
      isCurrentMonth: true,
    })
  }

  // 다음 달 (6줄 채우기)
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month + 2 > 12 ? 1 : month + 2
    const y = month + 2 > 12 ? year + 1 : year
    cells.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false })
  }

  return cells
}

export default function CalendarPage() {
  const { events, add, remove } = useCalendar()
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newColor, setNewColor] = useState<CalendarEvent['color']>('blue')
  const [newDate, setNewDate] = useState('')

  const cells = getMonthDays(viewYear, viewMonth)
  const eventMap = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    if (!eventMap.has(ev.date)) eventMap.set(ev.date, [])
    eventMap.get(ev.date)!.push(ev)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }
  function goToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  function handleAdd() {
    if (!newTitle.trim() || !newDate) return
    add({ date: newDate, title: newTitle.trim(), color: newColor })
    setNewTitle('')
    setNewDate('')
    setShowForm(false)
  }

  function handleCellClick(date: string) {
    setSelectedDate(selectedDate === date ? null : date)
  }

  function openAddForm(date?: string) {
    setNewDate(date || todayStr)
    setNewTitle('')
    setNewColor('blue')
    setShowForm(true)
  }

  const selectedEvents = selectedDate ? (eventMap.get(selectedDate) || []) : []

  // 이번 달 + 다음달 일정 목록
  const upcomingEvents = events
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  return (
    <div>
      <PageHeader title="일정 관리" description="중요 일정을 달력에 기입하고 관리합니다." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* 달력 */}
        <Card className="lg:col-span-3">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-slate-100 text-ink-soft">&larr;</button>
              <h2 className="text-lg font-bold text-ink">
                {viewYear}년 {viewMonth + 1}월
              </h2>
              <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-slate-100 text-ink-soft">&rarr;</button>
            </div>
            <div className="flex gap-2">
              <button onClick={goToday} className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-ink-soft hover:bg-slate-50">
                오늘
              </button>
              <Button onClick={() => openAddForm()}>+ 일정 추가</Button>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`py-2 text-center text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-ink-faint'}`}>
                {w}
              </div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const isToday = cell.date === todayStr
              const isSelected = cell.date === selectedDate
              const dayEvents = eventMap.get(cell.date) || []
              const dayOfWeek = i % 7

              return (
                <div
                  key={cell.date + i}
                  onClick={() => handleCellClick(cell.date)}
                  className={`min-h-[80px] cursor-pointer border-b border-r border-slate-100 p-1.5 transition-colors ${
                    !cell.isCurrentMonth ? 'bg-slate-50/50' : ''
                  } ${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-slate-50'}`}
                >
                  <div className={`mb-0.5 text-xs font-medium ${
                    isToday
                      ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white'
                      : !cell.isCurrentMonth
                        ? 'text-ink-faint/40'
                        : dayOfWeek === 0
                          ? 'text-red-400'
                          : dayOfWeek === 6
                            ? 'text-blue-400'
                            : 'text-ink-soft'
                  }`}>
                    {cell.day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight border ${COLOR_BG[ev.color]}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-ink-faint px-1">+{dayEvents.length - 3}건</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* 사이드 패널 */}
        <div className="space-y-4">
          {/* 선택된 날짜 일정 */}
          {selectedDate && (
            <Card>
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink">{selectedDate}</h3>
                  <button
                    onClick={() => openAddForm(selectedDate)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    + 추가
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {selectedEvents.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-ink-faint">일정이 없습니다.</p>
                )}
                {selectedEvents.map((ev) => (
                  <div key={ev.id} className="flex items-start justify-between gap-2 px-4 py-2.5">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${COLOR_CLASSES[ev.color]}`} />
                      <div>
                        <p className="text-sm text-ink">{ev.title}</p>
                        <p className="text-[10px] text-ink-faint">{COLOR_LABEL[ev.color]}</p>
                      </div>
                    </div>
                    <button onClick={() => remove(ev.id)} className="shrink-0 text-[10px] text-red-400 hover:underline">
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 다가오는 일정 */}
          <Card>
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-bold text-ink">다가오는 일정</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingEvents.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-ink-faint">등록된 일정이 없습니다.</p>
              )}
              {upcomingEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 px-4 py-2.5">
                  <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${COLOR_CLASSES[ev.color]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{ev.title}</p>
                    <p className="text-[10px] text-ink-faint">{ev.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 색상 범례 */}
          <Card>
            <div className="px-4 py-3">
              <h3 className="mb-2 text-xs font-medium text-ink-faint">카테고리</h3>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <span key={c} className="flex items-center gap-1 text-xs text-ink-soft">
                    <span className={`inline-block h-2.5 w-2.5 rounded-sm ${COLOR_CLASSES[c]}`} />
                    {COLOR_LABEL[c]}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 일정 추가 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-ink">일정 추가</h2>

            <label className="mt-4 block text-xs font-medium text-ink-soft">날짜</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />

            <label className="mt-3 block text-xs font-medium text-ink-soft">일정 내용</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="예: 삼성SDI 1Q26 실적발표"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />

            <label className="mt-3 block text-xs font-medium text-ink-soft">카테고리</label>
            <div className="mt-1.5 flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    newColor === c ? `${COLOR_BG[c]} border-current font-semibold` : 'border-slate-200 text-ink-soft hover:bg-slate-50'
                  }`}
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[c]}`} />
                  {COLOR_LABEL[c]}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-ink-soft hover:bg-slate-100">
                취소
              </button>
              <Button onClick={handleAdd} disabled={!newTitle.trim() || !newDate}>
                추가
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
