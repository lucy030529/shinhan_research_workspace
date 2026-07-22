import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '../ui'

interface ImportRow {
  ticker: string
  name: string
  analyst: string
  lastUpdated: string
}

interface Props {
  onImport: (rows: ImportRow[]) => number
  onClose: () => void
}

const COLUMN_MAP: Record<string, keyof ImportRow> = {
  '종목코드': 'ticker',
  ticker: 'ticker',
  '종목명': 'name',
  name: 'name',
  '애널리스트': 'analyst',
  '담당': 'analyst',
  analyst: 'analyst',
  '최근업데이트': 'lastUpdated',
  '업데이트일': 'lastUpdated',
  lastupdated: 'lastUpdated',
}

function normalizeKey(raw: string): keyof ImportRow | undefined {
  const k = raw.trim().replace(/\s+/g, '').toLowerCase()
  for (const [pattern, field] of Object.entries(COLUMN_MAP)) {
    if (k === pattern.toLowerCase()) return field
  }
  return undefined
}

function parseExcelDate(v: unknown): string {
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  if (typeof v === 'string' && v.match(/^\d{4}[-/]\d{2}[-/]\d{2}/)) {
    return v.slice(0, 10).replace(/\//g, '-')
  }
  return ''
}

export default function ExcelImport({ onImport, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportRow[]>([])
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File) {
    setError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

        if (!raw.length) {
          setError('시트에 데이터가 없습니다.')
          return
        }

        const headers = Object.keys(raw[0])
        const mapping: Record<string, keyof ImportRow> = {}
        for (const h of headers) {
          const field = normalizeKey(h)
          if (field) mapping[h] = field
        }

        const required: (keyof ImportRow)[] = ['ticker', 'name', 'analyst', 'lastUpdated']
        const missing = required.filter((f) => !Object.values(mapping).includes(f))
        if (missing.length) {
          setError(`필수 컬럼 누락: ${missing.join(', ')}. 엑셀 헤더를 확인하세요.`)
          return
        }

        const rows: ImportRow[] = []
        for (const r of raw) {
          const row: Partial<ImportRow> = {}
          for (const [h, field] of Object.entries(mapping)) {
            if (field === 'lastUpdated') {
              row[field] = parseExcelDate(r[h])
            } else {
              row[field] = String(r[h] ?? '').trim()
            }
          }
          if (row.ticker && row.name && row.analyst && row.lastUpdated) {
            rows.push(row as ImportRow)
          }
        }

        if (!rows.length) {
          setError('유효한 행이 없습니다. 데이터를 확인하세요.')
          return
        }
        setPreview(rows)
      } catch {
        setError('파일을 읽을 수 없습니다. xlsx/xls 형식인지 확인하세요.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function doImport() {
    const added = onImport(preview)
    setResult(`${preview.length}건 중 ${added}건 신규 등록 (중복 ${preview.length - added}건 건너뜀)`)
    setPreview([])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink">엑셀 임포트</h2>
        <p className="mt-1 text-xs text-neutral-500">
          필수 컬럼: 종목코드, 종목명, 애널리스트(담당), 최근업데이트(업데이트일)
        </p>

        <div className="mt-4">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            파일 선택 (.xlsx / .xls / .csv)
          </Button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {result && <p className="mt-3 text-sm text-emerald-600">{result}</p>}

        {preview.length > 0 && (
          <>
            <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-neutral-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-neutral-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-neutral-500">종목코드</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-500">종목명</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-500">애널리스트</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-500">업데이트일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150">
                  {preview.map((r, i) => (
                    <tr key={i} className="hover:bg-neutral-100">
                      <td className="px-3 py-1.5 tabular-nums">{r.ticker}</td>
                      <td className="px-3 py-1.5">{r.name}</td>
                      <td className="px-3 py-1.5">{r.analyst}</td>
                      <td className="px-3 py-1.5 tabular-nums">{r.lastUpdated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-neutral-500">{preview.length}건 미리보기</p>
          </>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
          {preview.length > 0 && (
            <Button onClick={doImport}>
              {preview.length}건 임포트
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
