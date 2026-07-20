import { ComingSoon, PageHeader } from '../components/ui'

export default function ArchivePage() {
  return (
    <div>
      <PageHeader
        title="자료실 · 데이터 수집"
        description="IR 자료 · DART 공시 · 애널리스트 리포트 · 국민연금 주간 이슈."
      />
      <ComingSoon
        phase="Phase 5"
        items={[
          'IR 자료 PDF 자동 업데이트 목록 (어댑터)',
          'DART 공시 추출 리스트 (OpenDART API 어댑터)',
          '애널리스트 리포트 수집 리스트',
          '국민연금 주간 이슈 요약 위젯',
        ]}
      />
    </div>
  )
}
