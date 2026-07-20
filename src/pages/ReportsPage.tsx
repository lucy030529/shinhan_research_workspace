import { ComingSoon, PageHeader } from '../components/ui'

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="보고서 작성 (국내/해외 기업)"
        description="재무데이터 자동 로드 → AI 초안 생성 → 편집 → Word 내보내기."
      />
      <ComingSoon
        phase="Phase 4"
        items={[
          '기업 선택 → 재무데이터(IS 등) 자동 로드 (퀀티/재무 API 어댑터)',
          '"리프레시" 버튼으로 데이터 갱신',
          '학습된 서식 기준 AI 보고서 초안 생성 (LLM 어댑터)',
          '초안 편집 에디터',
          'Word(.docx) 서식 내보내기',
          'IR 자료 PDF 업로드/첨부 관리',
        ]}
      />
    </div>
  )
}
