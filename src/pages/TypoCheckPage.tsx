import { ComingSoon, PageHeader } from '../components/ui'

export default function TypoCheckPage() {
  return (
    <div>
      <PageHeader
        title="오타 검수"
        description="보고서 텍스트의 오타·맞춤법 의심 구간을 검수합니다."
      />
      <ComingSoon
        phase="Phase 5"
        items={[
          '텍스트 붙여넣기 → 오타/맞춤법 의심 구간 하이라이트',
          '맞춤법 API 어댑터 (현재 규칙 기반 목업)',
          '수정 제안 적용',
        ]}
      />
    </div>
  )
}
