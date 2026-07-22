import { useEffect, useState } from 'react'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { useCalendar, type CalendarEvent } from '../store/calendar'
import { useAuth, fetchProfiles } from '../store/auth'

const COLORS: CalendarEvent['color'][] = ['blue', 'red', 'green', 'amber', 'purple', 'cyan']
const COLOR_CLASSES: Record<CalendarEvent['color'], string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  cyan: 'bg-shinhan-sky',
}
const COLOR_BG: Record<CalendarEvent['color'], string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  cyan: 'bg-shinhan-sky/15 text-shinhan-navy border-shinhan-sky/40',
}
// 기간 일정 바 색상 (더 진한 배경)
const COLOR_BAR: Record<CalendarEvent['color'], string> = {
  blue: 'bg-blue-500 text-white',
  red: 'bg-red-500 text-white',
  green: 'bg-emerald-500 text-white',
  amber: 'bg-amber-500 text-white',
  purple: 'bg-purple-500 text-white',
  cyan: 'bg-shinhan-sky/60 text-shinhan-navy',
}
const COLOR_LABEL: Record<CalendarEvent['color'], string> = {
  blue: '실적',
  red: '마감',
  green: '미팅',
  amber: '콥데이',
  purple: '기타',
  cyan: '교육',
}

const ANALYSTS = [
  '이동헌', '박광래', '김선미', '이진명', '최민기',
  '한승훈', '조상훈', '박현진', '지인해', '강석오',
  '김아람',
]

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface DayCell {
  date: string
  day: number
  isCurrentMonth: boolean
}

function getMonthDays(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const cells: DayCell[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDays - i
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year
    cells.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: true })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month + 2 > 12 ? 1 : month + 2
    const y = month + 2 > 12 ? year + 1 : year
    cells.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false })
  }
  return cells
}

function eventOnDate(ev: CalendarEvent, date: string): boolean {
  if (ev.endDate && ev.endDate !== ev.date) return date >= ev.date && date <= ev.endDate
  return ev.date === date
}

function isMultiDay(ev: CalendarEvent): boolean {
  return !!(ev.endDate && ev.endDate !== ev.date)
}

function formatDateRange(ev: CalendarEvent): string {
  if (ev.endDate && ev.endDate !== ev.date) return `${ev.date} ~ ${ev.endDate}`
  return ev.date
}

interface WeekBar {
  ev: CalendarEvent
  startCol: number
  span: number
  lane: number
  isStart: boolean
  isEnd: boolean
}

function computeWeekBars(weekDates: string[], allEvents: CalendarEvent[]): WeekBar[] {
  const multiDayEvents = allEvents.filter(isMultiDay)
  const bars: WeekBar[] = []
  const lanes: { startCol: number; endCol: number }[][] = []

  for (const ev of multiDayEvents) {
    const evEnd = ev.endDate!
    let startCol = -1
    let endCol = -1
    for (let c = 0; c < 7; c++) {
      if (weekDates[c] >= ev.date && weekDates[c] <= evEnd) {
        if (startCol === -1) startCol = c
        endCol = c
      }
    }
    if (startCol === -1) continue

    const span = endCol - startCol + 1
    const isStart = weekDates[startCol] === ev.date
    const isEnd = weekDates[endCol] === evEnd

    let assignedLane = -1
    for (let l = 0; l < lanes.length; l++) {
      const hasOverlap = lanes[l].some((b) => !(endCol < b.startCol || startCol > b.endCol))
      if (!hasOverlap) {
        assignedLane = l
        lanes[l].push({ startCol, endCol })
        break
      }
    }
    if (assignedLane === -1) {
      assignedLane = lanes.length
      lanes.push([{ startCol, endCol }])
    }

    bars.push({ ev, startCol, span, lane: assignedLane, isStart, isEnd })
  }
  return bars
}

export default function CalendarPage() {
  const { events, add, remove, update, fetchEvents, loaded } = useCalendar()
  const user = useAuth((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newColor, setNewColor] = useState<CalendarEvent['color']>('blue')
  const [newDate, setNewDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [newAnalyst, setNewAnalyst] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newIsDepartment, setNewIsDepartment] = useState(false)
  const [newParticipants, setNewParticipants] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const [profiles, setProfiles] = useState<Record<string, { name: string; avatar?: string; title?: string; department?: string }>>({})

  useEffect(() => { fetchProfiles().then(setProfiles) }, [])
  useEffect(() => { if (!loaded) fetchEvents() }, [loaded, fetchEvents])

  const departmentEvents = events
    .filter((e) => e.isDepartment)
    .sort((a, b) => a.date.localeCompare(b.date))

  const cells = getMonthDays(viewYear, viewMonth)
  // 주별로 분할
  const weeks: DayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
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
    if (editingId) {
      update(editingId, {
        date: newDate,
        endDate: newEndDate && newEndDate !== newDate ? newEndDate : undefined,
        title: newTitle.trim(),
        color: newColor,
        analyst: newAnalyst || undefined,
        time: newTime || undefined,
        isDepartment: newIsDepartment || undefined,
        participants: newParticipants.length > 0 ? newParticipants : undefined,
      })
    } else {
      add({
        date: newDate,
        ...(newEndDate && newEndDate !== newDate ? { endDate: newEndDate } : {}),
        title: newTitle.trim(),
        color: newColor,
        ...(newAnalyst ? { analyst: newAnalyst } : {}),
        ...(newTime ? { time: newTime } : {}),
        ...(newIsDepartment ? { isDepartment: true } : {}),
        ...(newParticipants.length > 0 ? { participants: newParticipants } : {}),
        createdBy: user?.name || '',
      })
    }
    setNewTitle('')
    setNewDate('')
    setNewEndDate('')
    setNewAnalyst('')
    setNewTime('')
    setNewIsDepartment(false)
    setNewParticipants([])
    setEditingId(null)
    setShowForm(false)
  }

  function openEditForm(ev: CalendarEvent) {
    setEditingId(ev.id)
    setNewDate(ev.date)
    setNewEndDate(ev.endDate || '')
    setNewTitle(ev.title)
    setNewColor(ev.color)
    setNewAnalyst(ev.analyst || '')
    setNewTime(ev.time || '')
    setNewIsDepartment(!!ev.isDepartment)
    setNewParticipants(ev.participants || [])
    setShowForm(true)
  }

  function handleCellClick(date: string) {
    setSelectedDate(selectedDate === date ? null : date)
  }

  function openAddForm(date?: string) {
    setEditingId(null)
    setNewDate(date || todayStr)
    setNewEndDate('')
    setNewTitle('')
    setNewColor('blue')
    setNewAnalyst(user?.name || '')
    setNewTime('')
    setNewIsDepartment(false)
    setNewParticipants([])
    setShowForm(true)
  }

  const selectedEvents = selectedDate
    ? events
        .filter((ev) => eventOnDate(ev, selectedDate))
        .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
    : []

  const upcomingEvents = events
    .filter((e) => (e.endDate || e.date) >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99:99').localeCompare(b.time || '99:99'))
    .slice(0, 10)

  return (
    <div>
      <PageHeader title="일정 관리" description="중요 일정을 달력에 기입하고 관리합니다." />

      {/* 부서 공통사항 */}
      <Card className="mb-6">
        <div className="flex items-center justify-between border-b border-neutral-150 px-5 py-3">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <h3 className="text-sm font-semibold text-ink">부서 공통사항</h3>
            <Badge tone="brand">{departmentEvents.length}건</Badge>
          </div>
          <Button onClick={() => { openAddForm(); setNewIsDepartment(true); setNewAnalyst(''); setNewColor('purple') }}>
            + 공통사항 추가
          </Button>
        </div>
        {departmentEvents.length > 0 ? (
          <div className="divide-y divide-neutral-150">
            {departmentEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between px-5 py-2.5">
                <div className="flex items-center gap-3">
                  <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${COLOR_CLASSES[ev.color]}`} />
                  <div>
                    <p className="text-sm text-ink">{ev.title}</p>
                    <p className="text-[10px] text-neutral-500">
                      {formatDateRange(ev)}
                      {ev.time && ` · ${ev.time}`}
                      {ev.createdBy && ` · ${ev.createdBy}`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => openEditForm(ev)} className="text-[10px] text-brand-500 hover:underline">수정</button>
                  <button onClick={() => remove(ev.id)} className="text-[10px] text-danger-600 hover:underline">삭제</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-xs text-neutral-500">등록된 공통사항이 없습니다.</p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-neutral-150 px-5 py-3">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-neutral-100 text-neutral-600">&larr;</button>
              <h2 className="text-lg font-bold text-ink">{viewYear}년 {viewMonth + 1}월</h2>
              <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-neutral-100 text-neutral-600">&rarr;</button>
            </div>
            <div className="flex gap-2">
              <button onClick={goToday} className="rounded-lg border border-neutral-200 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-100">오늘</button>
              <Button onClick={() => openAddForm()}>+ 일정 추가</Button>
            </div>
          </div>

          {/* 요일 */}
          <div className="grid grid-cols-7 border-b border-neutral-150">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`py-2 text-center text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-neutral-500'}`}>{w}</div>
            ))}
          </div>

          {/* 주별 렌더링 */}
          {(() => {
            // 모든 주의 바 레인 수 중 최대값으로 통일 → 모든 셀 높이 동일
            const allWeekBars = weeks.map((week) => computeWeekBars(week.map((c) => c.date), events))
            const maxLaneCount = Math.max(0, ...allWeekBars.map((bars) => bars.length > 0 ? Math.max(...bars.map((b) => b.lane)) + 1 : 0))
            const barSpacerH = maxLaneCount * 22
            const cellH = 120 + barSpacerH // 기본 120px + 바 공간

            return weeks.map((week, weekIdx) => {
              const bars = allWeekBars[weekIdx]

              return (
                <div key={weekIdx} className="relative">
                  <div className="grid grid-cols-7">
                    {week.map((cell, colIdx) => {
                      const isToday = cell.date === todayStr
                      const isSelected = cell.date === selectedDate
                      const dayOfWeek = colIdx
                      const singleEvents = events.filter((ev) => !isMultiDay(ev) && ev.date === cell.date).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))

                      return (
                        <div
                          key={cell.date}
                          onClick={() => handleCellClick(cell.date)}
                          style={{ height: cellH }}
                          className={`cursor-pointer overflow-hidden border-b border-r border-neutral-150 p-1.5 transition-colors ${
                            !cell.isCurrentMonth ? 'bg-neutral-100/50' : ''
                          } ${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-neutral-100'}`}
                        >
                          {/* 날짜 숫자 */}
                          <div className={`mb-1 h-5 text-xs font-medium leading-5 ${
                            isToday
                              ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white'
                              : !cell.isCurrentMonth
                                ? 'text-neutral-500/40'
                                : dayOfWeek === 0 ? 'text-red-400'
                                : dayOfWeek === 6 ? 'text-blue-400'
                                : 'text-neutral-600'
                          }`}>
                            {cell.day}
                          </div>
                          {/* 기간 일정 바 공간 확보 */}
                          {barSpacerH > 0 && <div style={{ height: barSpacerH }} />}
                          {/* 개별 일정 */}
                          <div className="space-y-px">
                            {singleEvents.slice(0, 3).map((ev) => (
                              <div
                                key={ev.id}
                                className={`h-[18px] truncate rounded px-1 text-[10px] font-medium leading-[18px] border ${COLOR_BG[ev.color]} ${ev.isDepartment ? 'ring-1 ring-brand-300' : ''}`}
                                title={`${ev.isDepartment ? '[공통] ' : ''}${ev.title}${ev.analyst ? ` (${ev.analyst})` : ''}${ev.time ? ` ${ev.time}` : ''}${ev.participants?.length ? ` · 참여: ${ev.participants.join(', ')}` : ''}`}
                              >
                                {ev.isDepartment ? '★ ' : ''}{ev.time ? `${ev.time} ` : ''}{ev.title}
                              </div>
                            ))}
                            {singleEvents.length > 3 && (
                              <div className="text-[10px] text-neutral-500 px-1">+{singleEvents.length - 3}건</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* 기간 일정 바 (절대 위치, 셀 위에 겹침) */}
                  {bars.map((bar) => (
                    <div
                      key={`${bar.ev.id}-${weekIdx}`}
                      className="pointer-events-none absolute z-10"
                      style={{
                        top: `${30 + bar.lane * 22}px`,
                        left: `${(bar.startCol / 7) * 100}%`,
                        width: `${(bar.span / 7) * 100}%`,
                      }}
                    >
                      <div
                        className={`pointer-events-auto h-[18px] truncate px-1.5 text-[10px] font-bold leading-[18px] ${COLOR_BAR[bar.ev.color]} ${
                          bar.isStart && bar.isEnd ? 'mx-1 rounded'
                          : bar.isStart ? 'ml-1 rounded-l'
                          : bar.isEnd ? 'mr-1 rounded-r'
                          : ''
                        } ${bar.ev.isDepartment ? 'ring-1 ring-brand-300' : ''}`}
                        title={`${bar.ev.isDepartment ? '[공통] ' : ''}${bar.ev.title} (${formatDateRange(bar.ev)})${bar.ev.analyst ? ` · ${bar.ev.analyst}` : ''}`}
                      >
                        {bar.isStart ? `${bar.ev.isDepartment ? '★ ' : ''}${bar.ev.title}` : '\u00A0'}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })
          })()}
        </Card>

        {/* 사이드 패널 */}
        <div className="space-y-4">
          {selectedDate && (
            <Card>
              <div className="border-b border-neutral-150 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink">{selectedDate}</h3>
                  <button onClick={() => openAddForm(selectedDate)} className="text-xs text-brand-500 hover:underline">+ 추가</button>
                </div>
              </div>
              <div className="divide-y divide-neutral-150">
                {selectedEvents.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-neutral-500">일정이 없습니다.</p>
                )}
                {selectedEvents.map((ev) => {
                  const ep = ev.analyst ? profiles[ev.analyst] : undefined
                  return (
                  <div
                    key={ev.id}
                    className="flex items-start justify-between gap-2 px-4 py-2.5 cursor-pointer hover:bg-neutral-100 transition-colors"
                    onClick={() => setDetailEvent(ev)}
                  >
                    <div className="flex items-start gap-2.5">
                      {ep?.avatar?.startsWith('data:') ? (
                        <img src={ep.avatar} alt="" className="mt-0.5 h-6 w-6 rounded-full object-cover ring-1 ring-neutral-200" />
                      ) : (
                        <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${COLOR_CLASSES[ev.color]}`}>
                          {(ev.analyst || '?')[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-ink">
                          {ev.isDepartment && <span className="mr-1 text-brand-500 font-semibold">[공통]</span>}
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {ev.analyst && <span className="font-medium text-neutral-600">{ev.analyst}</span>}
                          {ev.analyst && ' · '}{COLOR_LABEL[ev.color]}
                          {ev.time && ` · ${ev.time}`}
                        </p>
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-1 text-neutral-400">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                  )
                })}
              </div>
            </Card>
          )}

          <Card>
            <div className="border-b border-neutral-150 px-4 py-3">
              <h3 className="text-sm font-bold text-ink">다가오는 일정</h3>
            </div>
            <div className="divide-y divide-neutral-150">
              {upcomingEvents.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-neutral-500">등록된 일정이 없습니다.</p>
              )}
              {upcomingEvents.map((ev) => {
                const ep = ev.analyst ? profiles[ev.analyst] : undefined
                return (
                <div
                  key={ev.id}
                  className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => setDetailEvent(ev)}
                >
                  {ep?.avatar?.startsWith('data:') ? (
                    <img src={ep.avatar} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-neutral-200" />
                  ) : (
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${COLOR_CLASSES[ev.color]}`}>
                      {(ev.analyst || '?')[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {ev.isDepartment && <span className="mr-1 text-brand-500 font-semibold">[공통]</span>}
                      {ev.title}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      {formatDateRange(ev)}{ev.time && ` ${ev.time}`}{ev.analyst && ` · ${ev.analyst}`}
                    </p>
                  </div>
                </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <div className="px-4 py-3">
              <h3 className="mb-2 text-xs font-medium text-neutral-500">카테고리</h3>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <span key={c} className="flex items-center gap-1 text-xs text-neutral-600">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => { setShowForm(false); setEditingId(null) }}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-ink">
              {editingId ? (newIsDepartment ? '부서 공통사항 수정' : '일정 수정') : (newIsDepartment ? '부서 공통사항 추가' : '일정 추가')}
            </h2>

            <label className="mt-4 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsDepartment}
                onChange={(e) => setNewIsDepartment(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-ink">부서 공통사항으로 등록</span>
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600">시작일</label>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600">종료일 <span className="text-neutral-400">(선택)</span></label>
                <input type="date" value={newEndDate} min={newDate} onChange={(e) => setNewEndDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            </div>

            <label className="mt-3 block text-xs font-medium text-neutral-600">일정 내용</label>
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              placeholder={newIsDepartment ? '예: 하반기 컴플라이언스 교육' : '예: 삼성SDI 1Q26 실적발표'}
              autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />

            {!newIsDepartment && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600">담당 애널리스트</label>
                  <select value={newAnalyst} onChange={(e) => setNewAnalyst(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                    <option value="">선택 안함</option>
                    {ANALYSTS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600">시간</label>
                  <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
              </div>
            )}

            <div className="mt-3">
              <label className="block text-xs font-medium text-neutral-600">참여자 <span className="text-neutral-400">(선택)</span></label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(() => {
                  const profileNames = Object.values(profiles).map((p) => p.name).filter(Boolean)
                  const allNames = [...new Set([...ANALYSTS, ...profileNames])].sort()
                  return allNames.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setNewParticipants((prev) => prev.includes(a) ? prev.filter((p) => p !== a) : [...prev, a])}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        newParticipants.includes(a)
                          ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      {a}
                    </button>
                  ))
                })()}
              </div>
            </div>

            <label className="mt-3 block text-xs font-medium text-neutral-600">카테고리</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setNewColor(c)}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    newColor === c ? `${COLOR_BG[c]} border-current font-semibold` : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}>
                  <span className={`inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[c]}`} />
                  {COLOR_LABEL[c]}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="rounded-lg px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">취소</button>
              <Button onClick={handleAdd} disabled={!newTitle.trim() || !newDate}>{editingId ? '저장' : '추가'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* 일정 상세 모달 */}
      {detailEvent && (() => {
        const ev = detailEvent
        const ep = ev.analyst ? profiles[ev.analyst] : undefined
        const canEdit = isAdmin || ev.createdBy === user?.name || ev.analyst === user?.name
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDetailEvent(null)}>
            <div className="w-full max-w-sm rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              {/* 헤더 */}
              <div className={`rounded-t-lg px-5 py-4 ${COLOR_BG[ev.color]} border-b`}>
                <div className="flex items-center justify-between">
                  <Badge tone="slate">{COLOR_LABEL[ev.color]}</Badge>
                  <button onClick={() => setDetailEvent(null)} className="text-neutral-500 hover:text-ink">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
                <h3 className="mt-2 text-base font-bold text-ink">
                  {ev.isDepartment && <span className="mr-1 text-brand-500">[공통]</span>}
                  {ev.title}
                </h3>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* 담당자 */}
                {ev.analyst && (
                  <div className="flex items-center gap-3">
                    {ep?.avatar?.startsWith('data:') ? (
                      <img src={ep.avatar} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-neutral-200" />
                    ) : (
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${COLOR_CLASSES[ev.color]}`}>
                        {ev.analyst[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-ink">{ev.analyst}</p>
                      {ep?.title && <p className="text-xs text-neutral-500">{ep.title}</p>}
                      {ep?.department && <p className="text-xs text-neutral-400">{ep.department}</p>}
                    </div>
                  </div>
                )}

                {/* 일시 */}
                <div className="flex items-start gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 text-neutral-400">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <div className="text-sm text-ink">
                    <p>{formatDateRange(ev)}</p>
                    {ev.time && <p className="text-xs text-neutral-500">{ev.time}</p>}
                  </div>
                </div>

                {/* 참여자 */}
                {ev.participants && ev.participants.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-neutral-500">공동 참여자</p>
                    <div className="flex flex-wrap gap-2">
                      {ev.participants.map((name) => {
                        const pp = profiles[name]
                        return (
                          <div key={name} className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-1">
                            {pp?.avatar?.startsWith('data:') ? (
                              <img src={pp.avatar} alt="" className="h-4 w-4 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-400 text-[8px] font-bold text-white">
                                {name[0]}
                              </div>
                            )}
                            <span className="text-xs text-ink">{name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 등록자 */}
                {ev.createdBy && (
                  <p className="text-xs text-neutral-400">등록: {ev.createdBy}</p>
                )}
              </div>

              {/* 하단 버튼 */}
              {canEdit && (
                <div className="flex justify-end gap-2 border-t border-neutral-150 px-5 py-3">
                  <button
                    onClick={() => { openEditForm(ev); setDetailEvent(null) }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-brand-500 hover:bg-brand-50"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => { remove(ev.id); setDetailEvent(null) }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-danger-600 hover:bg-danger-100"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
