import { ComingSoon, PageHeader } from '../components/ui'

export default function WorklogPage() {
  return (
    <div>
      <PageHeader
        title="업무일지 · 워크로드"
        description="회원별 업무일지 작성 및 업무 로드 시각화."
      />
      <ComingSoon
        phase="Phase 3"
        items={[
          '회원별 업무일지 입력 · 조회',
          '회원별 업무 로드(진행 건수 · 마감 임박) 시각화',
          '팀 전체 워크로드 대시보드',
        ]}
      />
    </div>
  )
}
