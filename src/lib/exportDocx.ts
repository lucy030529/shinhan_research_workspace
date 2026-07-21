// 신한 레포트 DOCX 내보내기 — earnings_qa의 _parse_md + 스타일 기반 생성 이식
// 신한 기본 템플릿(.docx)은 로컬 환경 전용이므로,
// 여기서는 자체적으로 신한 스타일을 구현한 DOCX를 생성한다.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  Header,
} from 'docx'
import { saveAs } from 'file-saver'
import type { ReportType } from '../data/reportPrompts'

// ── 색상 상수 ──
const SHINHAN_NAVY = '0F1A2E'
const SHINHAN_ACCENT = '2C4A7C'
const SHINHAN_LIGHT = 'E8EEF6'
const TABLE_HEADER_BG = '0F1A2E'
const TABLE_EVEN_BG = 'F8FAFC'
const BORDER_COLOR = 'CDD5E1'

const THIN_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  left: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  right: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
} as const

// ── 마크다운 파싱 (earnings_qa _parse_md 이식) ──
type ElementType = 'Title2' | 'Title1' | 'Title3' | 'body' | 'bullet' | 'qa_q' | 'qa_a' | 'table' | 'blockquote' | 'empty'

interface ParsedElement {
  type: ElementType
  content: string
  tableLines?: string[]
}

function parseMd(mdText: string): ParsedElement[] {
  const elements: ParsedElement[] = []
  const lines = mdText.split('\n')
  let i = 0

  while (i < lines.length) {
    const s = lines[i].trim()

    if (!s) {
      i++
      continue
    }

    // 테이블
    if (s.startsWith('|') && s.split('|').length >= 3) {
      const tbl: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tbl.push(lines[i].trim())
        i++
      }
      elements.push({ type: 'table', content: '', tableLines: tbl })
      continue
    }

    // 헤더
    if (s.startsWith('### ')) {
      elements.push({ type: 'Title1', content: s.slice(4) })
    } else if (s.startsWith('## ')) {
      elements.push({ type: 'Title2', content: s.slice(3) })
    } else if (s.startsWith('# ')) {
      elements.push({ type: 'Title3', content: s.slice(2) })
    } else if (s.startsWith('■')) {
      elements.push({ type: 'Title3', content: s })
    } else if (s === '주요 Q&A') {
      elements.push({ type: 'Title3', content: s })
    } else if (s.startsWith('Q.') || s.startsWith('Q ')) {
      elements.push({ type: 'qa_q', content: s })
    } else if (s.startsWith('A.') || s.startsWith('A ')) {
      elements.push({ type: 'qa_a', content: s })
    } else if (s.startsWith('> ')) {
      elements.push({ type: 'blockquote', content: s.slice(2) })
    } else if (s.startsWith('- ') || s.startsWith('▸ ')) {
      elements.push({ type: 'bullet', content: s.slice(2) })
    } else {
      elements.push({ type: 'body', content: s })
    }
    i++
  }

  return elements
}

// ── 볼드 마크다운 처리 TextRun 배열 생성 ──
function makeBoldRuns(text: string, baseBold = false, fontSize = 20, font = 'Malgun Gothic', color?: string): TextRun[] {
  const parts = text.split('**')
  const runs: TextRun[] = []
  for (let idx = 0; idx < parts.length; idx++) {
    if (!parts[idx]) continue
    runs.push(new TextRun({
      text: parts[idx],
      bold: idx % 2 === 1 ? true : baseBold,
      size: fontSize,
      font,
      color: color || SHINHAN_NAVY,
    }))
  }
  return runs
}

// ── 테이블 생성 ──
function makeTableFromMd(tableLines: string[]): Table {
  const rowsData: string[][] = []
  for (const line of tableLines) {
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
    // 구분선 스킵
    // separator row detection (dashes, colons, spaces only)
    const sepRegex = new RegExp('^[\\-:\\s]*$')
    if (cells.every(c => sepRegex.test(c))) continue
    if (cells.length > 0) rowsData.push(cells)
  }

  if (rowsData.length === 0) {
    return new Table({ rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph('')] })] })], width: { size: 100, type: WidthType.PERCENTAGE } })
  }

  const ncols = Math.max(...rowsData.map(r => r.length))

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rowsData.map((rd, ri) =>
      new TableRow({
        children: Array.from({ length: ncols }, (_, ci) =>
          new TableCell({
            borders: THIN_BORDER,
            width: { size: Math.floor(100 / ncols), type: WidthType.PERCENTAGE },
            shading: ri === 0
              ? { type: ShadingType.SOLID, color: TABLE_HEADER_BG }
              : ri % 2 === 0
                ? { type: ShadingType.SOLID, color: TABLE_EVEN_BG }
                : undefined,
            children: [
              new Paragraph({
                alignment: ri === 0 ? AlignmentType.CENTER : (ci > 0 ? AlignmentType.RIGHT : AlignmentType.LEFT),
                children: [new TextRun({
                  text: rd[ci] || '',
                  bold: ri === 0,
                  size: 18,
                  font: 'Malgun Gothic',
                  color: ri === 0 ? 'FFFFFF' : SHINHAN_NAVY,
                })],
              }),
            ],
          })
        ),
      })
    ),
  })
}

// ── 메인 DOCX 빌드 ──
export async function exportDocx(
  report: { title: string; content: string; opinion: string; targetPrice: string; companyName: string },
  _financialData?: unknown,
  reportType?: ReportType,
) {
  const elements = parseMd(report.content)
  const children: (Paragraph | Table)[] = []

  // ── 헤더: 신한투자증권 ──
  const headerParagraph = new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [
      new TextRun({ text: '신한투자증권', bold: true, size: 16, font: 'Malgun Gothic', color: SHINHAN_ACCENT }),
      new TextRun({ text: '  |  ', size: 16, font: 'Malgun Gothic', color: BORDER_COLOR }),
      new TextRun({ text: 'Shinhan Securities', size: 16, font: 'Malgun Gothic', color: '999999' }),
    ],
  })

  // ── 표지: 레포트 제목 ──
  children.push(
    new Paragraph({
      spacing: { before: 100 },
      children: [new TextRun({
        text: report.companyName,
        bold: true,
        size: 36,
        font: 'Malgun Gothic',
        color: SHINHAN_NAVY,
      })],
    })
  )

  // 부제 (타입별)
  const typeSubtitles: Record<string, string> = {
    qa: '실적 Q&A',
    sokbo: '신한 속보',
    review: 'COMPANY REPORT  |  실적 리뷰',
    overseas: 'COMPANY REPORT  |  해외기업 분석',
    note: '컨퍼런스콜 노트',
  }

  const subtitle = reportType ? typeSubtitles[reportType] || '' : ''
  if (subtitle) {
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({
          text: subtitle,
          size: 22,
          font: 'Malgun Gothic',
          color: SHINHAN_ACCENT,
        })],
      })
    )
  }

  // 투자의견/목표주가 (있으면)
  if (report.opinion || report.targetPrice) {
    children.push(
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [
          ...(report.opinion ? [new TextRun({ text: `투자의견: ${report.opinion}`, bold: true, size: 22, font: 'Malgun Gothic', color: SHINHAN_NAVY })] : []),
          ...(report.opinion && report.targetPrice ? [new TextRun({ text: '    ', size: 22 })] : []),
          ...(report.targetPrice ? [new TextRun({ text: `목표주가: ${report.targetPrice}`, bold: true, size: 22, font: 'Malgun Gothic', color: SHINHAN_NAVY })] : []),
        ],
      })
    )
  }

  // 구분선
  children.push(
    new Paragraph({
      spacing: { before: 100, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: SHINHAN_ACCENT } },
      children: [],
    })
  )

  // ── 본문 요소 삽입 ──
  for (const el of elements) {
    switch (el.type) {
      case 'Title3':
        children.push(
          new Paragraph({
            spacing: { before: 300, after: 100 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: SHINHAN_ACCENT } },
            children: makeBoldRuns(el.content, true, 24, 'Malgun Gothic', SHINHAN_NAVY),
          })
        )
        break

      case 'Title2':
        children.push(
          new Paragraph({
            spacing: { before: 250, after: 80 },
            border: { left: { style: BorderStyle.SINGLE, size: 6, color: SHINHAN_ACCENT } },
            indent: { left: 200 },
            children: makeBoldRuns(el.content, true, 22, 'Malgun Gothic', SHINHAN_NAVY),
          })
        )
        break

      case 'Title1':
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 60 },
            children: makeBoldRuns(el.content, true, 20, 'Malgun Gothic', SHINHAN_ACCENT),
          })
        )
        break

      case 'qa_q':
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 40 },
            children: makeBoldRuns(el.content, true, 20, 'Malgun Gothic', SHINHAN_NAVY),
          })
        )
        break

      case 'qa_a':
        children.push(
          new Paragraph({
            spacing: { before: 40, after: 100 },
            indent: { left: 100 },
            children: makeBoldRuns(el.content, false, 20, 'Malgun Gothic'),
          })
        )
        break

      case 'bullet':
        children.push(
          new Paragraph({
            spacing: { before: 40, after: 40 },
            indent: { left: 300 },
            children: [
              new TextRun({ text: '▸ ', size: 20, font: 'Malgun Gothic', color: SHINHAN_ACCENT }),
              ...makeBoldRuns(el.content, false, 20),
            ],
          })
        )
        break

      case 'blockquote':
        children.push(
          new Paragraph({
            spacing: { before: 80, after: 80 },
            indent: { left: 400 },
            border: { left: { style: BorderStyle.SINGLE, size: 6, color: SHINHAN_ACCENT } },
            shading: { type: ShadingType.SOLID, color: SHINHAN_LIGHT },
            children: makeBoldRuns(el.content, false, 19, 'Malgun Gothic', SHINHAN_ACCENT),
          })
        )
        break

      case 'table':
        if (el.tableLines && el.tableLines.length > 0) {
          children.push(
            new Paragraph({ spacing: { before: 100 }, children: [] })
          )
          children.push(makeTableFromMd(el.tableLines))
          children.push(
            new Paragraph({ spacing: { after: 100 }, children: [] })
          )
        }
        break

      case 'body':
      default:
        children.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: makeBoldRuns(el.content, false, 20),
          })
        )
        break
    }
  }

  // ── 문서 생성 ──
  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [headerParagraph],
          }),
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)

  const typeLabels: Record<string, string> = {
    qa: 'QA', sokbo: '속보', review: '실적리뷰', overseas: '해외기업', note: '컨콜노트',
  }
  const typeSuffix = reportType ? `_${typeLabels[reportType] || ''}` : '_리포트'
  const fname = `${report.companyName}${typeSuffix}.docx`.replace(/\s+/g, '_')
  saveAs(blob, fname)
}
