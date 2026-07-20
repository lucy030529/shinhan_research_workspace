// 파일에서 텍스트 추출 (클라이언트 사이드)
// PDF → pdf.js 없이 텍스트 파일/XLSX만 지원. PDF는 텍스트 안내 표시.

import * as XLSX from 'xlsx'

export async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'txt') {
    return await file.text()
  }

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const lines: string[] = []
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name]
      lines.push(`[시트: ${name}]`)
      const csv = XLSX.utils.sheet_to_csv(ws)
      lines.push(csv)
    }
    return lines.join('\n')
  }

  if (ext === 'pdf') {
    return `[PDF 파일: ${file.name}] — 클라이언트에서 PDF 텍스트 추출은 지원하지 않습니다. 텍스트를 직접 붙여넣거나 TXT/XLSX 형식으로 변환해주세요.`
  }

  if (ext === 'docx') {
    return `[DOCX 파일: ${file.name}] — 클라이언트에서 DOCX 텍스트 추출은 지원하지 않습니다. 텍스트를 직접 붙여넣어주세요.`
  }

  return `[파일: ${file.name}] — 지원하지 않는 형식입니다.`
}

export function formatFileSize(bytes: number): string {
  if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024).toFixed(0) + ' KB'
}
