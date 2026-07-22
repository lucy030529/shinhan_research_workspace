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
  cyan: 'bg-cyan-500',
}
const COLOR_BG: Record<CalendarEvent['color'], string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
}
// 기간 일정 바 색상 (더 진한 배경)
const COLOR_BAR: Record<CalendarEvent['color'], string> = {
  blue: 'bg-blue-500 text-white',
  red: 'bg-red-500 text-white',
  green: 'bg-emerald-500 text-white',
  amber: 'bg-amber-500 text-white',
  purple: 'bg-purple-500 text-white',
  cyan: 'bg-cyan-500 text-white',
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

// 기간 일정의 주간 바 계산
interface WeekBar {
  ev: CalendarEvent
  startCol: number // 0-6
  span: number     // 1-7
  lane: number     // 0-based row lane
  isStart: boolean // 이벤트 시작 주인지
  isEnd: boolean   // 이벤트 종료 주인지
}

function computeWeekBars(weekDates: string[], events: CalendarEvent[]): WeekBar[] {
  const multiDayEvents = events.filter(isMultiDay)
  const bars: WeekBar[] = []
  const lanes: string[][] = [] // lanes[laneIdx] = list of eventIds occupying that lane

  for (const ev of multiDayEvents) {
    const evEnd = ev.endDate!
    // 이 주에서 이벤트가 시작/끝나는 위치
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

    // 레인 할당 (겹치지 않는 레인 찾기)
    let assignedLane = -1
    for (let l = 0; l < lanes.length; l++) {
      if (!lanes[l].includes(ev.id)) {
        assignedLane = l
        lanes[l].push(ev.id)
        break
      }
    }
    if (assignedLane === -1) {
      assignedLane = lanes.length
      lanes.push([ev.id])
    }

    bars.push({ ev, startCol, span, lane: assignedLane, isStart, isEnd })
  }
  return bars
}

export default function CalendarPage() {
  const { events, add, remove, fetchEvents, loaded } = useCalendar()
  const user = useAuth((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

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
  const [profiles, setProfiles] = useState<Record<string, { name: string; avatar?: string; title?: string }>>({})

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
    add({
      date: newDate,
      ...(newEndDate && newEndDate !== newDate ? { endDate: newEndDate } : {}),
      title: newTitle.trim(),
      color: newColor,
      ...(newAnalyst ? { analyst: newAnalyst } : {}),
      ...(newTime ? { time: newTime } : {}),
      ...(newIsDepartment ? { isDepartment: true } : {}),
      createdBy: user?.name || '',
    })
    setNewTitle('')
    setNewDate('')
    setNewEndDate('')
    setNewAnalyst('')
    setNewTime('')
    setNewIsDepartment(false)
    setShowForm(false)
  }

  function handleCellClick(date: string) {
    setSelectedDate(selectedDate === date ? null : date)
  }

  function openAddForm(date?: string) {
    setNewDate(date || todayStr)
    setNewEndDate('')
    setNewTitle('')
    setNewColor('blue')
    setNewAnalyst(user?.name || '')
    setNewTime('')
    setNewIsDepartment(false)
    setShowForm(true)
  }

  const selectedEvents = selectedDate ? events.filter((ev) => eventOnDate(ev, selectedDate)) : []

  const upcomingEvents = events
    .filter((e) => (e.endDate || e.date) >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
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
                {(isAdmin || ev.createdBy === user?.name) && (
                  <button onClick={() => remove(ev.id)} className="shrink-0 text-[10px] text-danger-600 hover:underline">삭제</button>
                )}
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
          {weeks.map((week, weekIdx) => {
            const weekDates = week.map((c) => c.date)
            const bars = computeWeekBars(weekDates, events)
            const barLaneCount = bars.length > 0 ? Math.max(...bars.map((b) => b.lane)) + 1 : 0

            return (
              <div key={weekIdx}>
                {/* 날짜 셀 (숫자 + 일정 모두 포함) */}
                <div className="grid grid-cols-7">
                  {week.map((cell, colIdx) => {
                    const isToday = cell.date === todayStr
                    const isSelected = cell.date === selectedDate
                    const dayOfWeek = colIdx
                    const singleEvents = events.filter((ev) => !isMultiDay(ev) && ev.date === cell.date)
                    const allEvents = [...singleEvents]

                    return (
                      <div
                        key={cell.date}
                        onClick={() => handleCellClick(cell.date)}
                        className={`min-h-[80px] cursor-pointer border-b border-r border-neutral-150 p-1.5 transition-colors ${
                          !cell.isCurrentMonth ? 'bg-neutral-100/50' : ''
                        } ${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-neutral-100'}`}
                      >
                        {/* 날짜 숫자 */}
                        <div className={`mb-1 text-xs font-medium ${
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
                        {/* 일정들 (숫자 아래) */}
                        <div className="space-y-0.5">
                          {allEvents.slice(0, 3).map((ev) => (
                            <div
                              key={ev.id}
                              className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight border ${COLOR_BG[ev.color]} ${ev.isDepartment ? 'ring-1 ring-brand-300' : ''}`}
                              title={`${ev.isDepartment ? '[공통] ' : ''}${ev.title}${ev.analyst ? ` (${ev.analyst})` : ''}${ev.time ? ` ${ev.time}` : ''}`}
                            >
                              {ev.isDepartment ? '★ ' : ''}{ev.time ? `${ev.time} ` : ''}{ev.title}
                            </div>
                          ))}
                          {allEvents.length > 3 && (
                            <div className="text-[10px] text-neutral-500 px-1">+{allEvents.length - 3}건</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 기간 일정 바 (날짜 아래) */}
                {barLaneCount > 0 && (
                  <div className="relative grid grid-cols-7 border-b border-neutral-150 bg-neutral-100/30" style={{ height: barLaneCount * 22 + 4 }}>
                    {week.map((_, colIdx) => (
                      <div key={colIdx} className="border-r border-neutral-150" />
                    ))}
                    {bars.map((bar) => {
                      const leftPct = (bar.startCol / 7) * 100
                      const widthPct = (bar.span / 7) * 100
                      return (
                        <div
                          key={bar.ev.id + '-' + weekIdx}
                          className={`absolute z-10 truncate px-1.5 text-[10px] font-medium leading-[20px] ${COLOR_BAR[bar.ev.color]} ${
                            bar.isStart ? 'rounded-l' : ''
                          } ${bar.isEnd ? 'rounded-r' : ''}`}
                          style={{
                            top: bar.lane * 22 + 2,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            height: 20,
                          }}
                          title={`${bar.ev.title} (${formatDateRange(bar.ev)})`}
                        >
                          {bar.isStart ? (bar.ev.isDepartment ? '★ ' : '') + bar.ev.title : ''}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
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
                  <div key={ev.id} className="flex items-start justify-between gap-2 px-4 py-2.5">
                    <div className="flex items-start gap-2">
                      {ep?.avatar?.startsWith('data:') ? (
                        <img src={ep.avatar} alt="" className="mt-0.5 h-5 w-5 rounded-full object-cover ring-1 ring-neutral-200" />
                      ) : (
                        <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${COLOR_CLASSES[ev.color]}`} />
                      )}
                      <div>
                        <p className="text-sm text-ink">
                          {ev.isDepartment && <span className="mr-1 text-brand-500 font-semibold">[공통]</span>}
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {COLOR_LABEL[ev.color]}
                          {ev.analyst && ` · ${ev.analyst}`}
                          {ev.time && ` · ${ev.time}`}
                          {ev.endDate && ev.endDate !== ev.date && ` · ~${ev.endDate}`}
                        </p>
                      </div>
                    </div>
                    {(isAdmin || ev.createdBy === user?.name || ev.analyst === user?.name) && (
                      <button onClick={() => remove(ev.id)} className="shrink-0 text-[10px] text-danger-600 hover:underline">삭제</button>
                    )}
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
              {upcomingEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 px-4 py-2.5">
                  <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${COLOR_CLASSES[ev.color]}`} />
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
              ))}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-ink">
              {newIsDepartment ? '부서 공통사항 추가' : '일정 추가'}
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
              <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">취소</button>
              <Button onClick={handleAdd} disabled={!newTitle.trim() || !newDate}>추가</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
