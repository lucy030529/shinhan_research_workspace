import { useState } from 'react'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { useWorklog } from '../store/worklog'
import { useTasks } from '../store/tasks'
import { useAuth } from '../store/auth'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function WorklogPage() {
  const user = useAuth((s) => s.user)
  const { entries, add, remove } = useWorklog()
  const tasks = useTasks((s) => s.items)

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [content, setContent] = useState('')
  const [filterAuthor, setFilterAuthor] = useState<string>('all')

  const authors = [...new Set(entries.map((e) => e.author))].sort()
  const filtered = filterAuthor === 'all' ? entries : entries.filter((e) => e.author === filterAuthor)
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  // 워크로드 데이터: 회원별 진행중+대기 업무 수
  const workloadData = authors.map((name) => {
    const doing = tasks.filter((t) => t.owner === name && t.status === 'doing').length
    const todo = tasks.filter((t) => t.owner === name && t.status === 'todo').length
    return { name, doing, todo, total: doing + todo }
  }).sort((a, b) => b.total - a.total)

  function handleSubmit() {
    if (!content.trim()) return
    add({ author: user?.name ?? '알 수 없음', date, content: content.trim() })
    setContent('')
  }

  function handleDelete(id: string) {
    if (confirm('이 업무일지를 삭제하시겠습니까?')) {
      remove(id)
    }
  }

  const COLORS = ['#1e3a5f', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']

  return (
    <div>
      <PageHeader
        title="업무일지 · 워크로드"
        description="회원별 업무일지를 작성하고 팀 워크로드를 확인합니다."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 워크로드 차트 */}
        <Card className="lg:col-span-1">
          <CardHeader title="팀 워크로드 (진행+대기)" />
          <div className="p-4">
            {workloadData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={workloadData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value}건`,
                      name === 'doing' ? '진행중' : '대기',
                    ]}
                  />
                  <Bar dataKey="doing" stackId="a" name="doing" radius={[0, 0, 0, 0]}>
                    {workloadData.map((_, i) => (
                      <Cell key={i} fill={COLORS[0]} />
                    ))}
                  </Bar>
                  <Bar dataKey="todo" stackId="a" name="todo" radius={[0, 4, 4, 0]}>
                    {workloadData.map((_, i) => (
                      <Cell key={i} fill={COLORS[2]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-ink-faint">업무 데이터가 없습니다.</p>
            )}
            <div className="mt-3 flex gap-4 text-xs text-ink-faint">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: COLORS[0] }} /> 진행중
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: COLORS[2] }} /> 대기
              </span>
            </div>
          </div>
        </Card>

        {/* 업무일지 작성 */}
        <Card className="lg:col-span-2">
          <CardHeader title="업무일지 작성" />
          <div className="p-5">
            <div className="flex gap-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="flex items-center text-sm text-ink-soft">
                작성자: <strong className="ml-1">{user?.name}</strong>
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="오늘 수행한 업무를 기록하세요..."
              rows={3}
              className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={handleSubmit} disabled={!content.trim()}>저장</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* 업무일지 목록 */}
      <Card className="mt-6">
        <CardHeader
          title="업무일지 기록"
          action={
            <select
              value={filterAuthor}
              onChange={(e) => setFilterAuthor(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-ink-soft focus:border-brand-500 focus:outline-none"
            >
              <option value="all">전체</option>
              {authors.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          }
        />
        <div className="divide-y divide-slate-100">
          {sorted.map((e) => (
            <div key={e.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge tone="brand">{e.author}</Badge>
                  <span className="text-xs tabular-nums text-ink-faint">{e.date}</span>
                </div>
                {e.author === user?.name && (
                  <button
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => handleDelete(e.id)}
                  >
                    삭제
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-ink whitespace-pre-wrap">{e.content}</p>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-ink-faint">업무일지가 없습니다.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
