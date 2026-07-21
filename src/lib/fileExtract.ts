// 파일에서 텍스트 추출 (클라이언트 사이드)
// PDF: pdfjs-dist, DOCX: mammoth, XLSX: xlsx

import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

// PDF.js 워커 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    if (text.trim()) pages.push(text)
  }

  return pages.join('\n')
}

async function extractDocxText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  return result.value
}

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
    try {
      return await extractPdfText(file)
    } catch (e) {
      return `[PDF 파일: ${file.name}] 텍스트 추출 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}. 텍스트를 직접 붙여넣어주세요.`
    }
  }

  if (ext === 'docx') {
    try {
      return await extractDocxText(file)
    } catch (e) {
      return `[DOCX 파일: ${file.name}] 텍스트 추출 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}. 텍스트를 직접 붙여넣어주세요.`
    }
  }

  return `[파일: ${file.name}] — 지원하지 않는 형식입니다.`
}

export function formatFileSize(bytes: number): string {
  if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024).toFixed(0) + ' KB'
}
