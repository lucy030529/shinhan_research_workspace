import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'
import type { FinancialData } from '../data/financials'

function fmt(n: number): string {
  return n.toLocaleString('ko-KR')
}

const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
} as const

function makeCell(text: string, bold = false, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) {
  return new TableCell({
    borders: BORDER,
    width: { size: 100, type: WidthType.AUTO },
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, bold, size: 18, font: 'Malgun Gothic' })],
      }),
    ],
  })
}

function financialTable(data: FinancialData): Table {
  const header = new TableRow({
    children: [
      makeCell('항목', true),
      ...data.periods.map((p) => makeCell(p, true, AlignmentType.RIGHT)),
    ],
  })

  const rows: [string, number[]][] = [
    ['매출액', data.incomeStatement.revenue],
    ['영업이익', data.incomeStatement.operatingProfit],
    ['순이익', data.incomeStatement.netIncome],
    ['EPS (원)', data.incomeStatement.eps],
    ['PER (배)', data.metrics.per],
    ['PBR (배)', data.metrics.pbr],
    ['ROE (%)', data.metrics.roe],
    ['영업이익률 (%)', data.metrics.operatingMargin],
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      header,
      ...rows.map(
        ([label, values]) =>
          new TableRow({
            children: [
              makeCell(label, false),
              ...values.map((v) => makeCell(fmt(v), false, AlignmentType.RIGHT)),
            ],
          }),
      ),
    ],
  })
}

export async function exportDocx(
  report: { title: string; content: string; opinion: string; targetPrice: string; companyName: string },
  financialData?: FinancialData,
) {
  const sections: Paragraph[] = []

  // 제목
  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: report.title, bold: true, size: 32, font: 'Malgun Gothic' })],
    }),
  )

  // 투자의견/목표주가
  sections.push(
    new Paragraph({
      spacing: { before: 200 },
      children: [
        new TextRun({ text: `투자의견: ${report.opinion}    목표주가: ${report.targetPrice}원`, bold: true, size: 22, font: 'Malgun Gothic' }),
      ],
    }),
  )

  sections.push(new Paragraph({ spacing: { before: 100 }, children: [] }))

  // 본문
  const lines = report.content.split('\n')
  for (const line of lines) {
    if (line.startsWith('■')) {
      sections.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300 },
          children: [new TextRun({ text: line, bold: true, size: 24, font: 'Malgun Gothic' })],
        }),
      )
    } else {
      sections.push(
        new Paragraph({
          spacing: { before: 60 },
          children: [new TextRun({ text: line, size: 20, font: 'Malgun Gothic' })],
        }),
      )
    }
  }

  // 재무 테이블
  if (financialData) {
    sections.push(new Paragraph({ spacing: { before: 400 }, children: [] }))
    sections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '■ 주요 재무 데이터', bold: true, size: 24, font: 'Malgun Gothic' })],
      }),
    )
  }

  const doc = new Document({
    sections: [
      {
        children: financialData
          ? [...sections, new Paragraph({ spacing: { before: 100 }, children: [] }), financialTable(financialData) as unknown as Paragraph]
          : sections,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${report.companyName}_리포트.docx`)
}
