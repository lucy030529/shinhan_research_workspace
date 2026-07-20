# 신한투자증권 기업분석2부 · 리서치 워크스페이스

기업분석2부의 반복 업무(커버리지 관리, 괴리율 모니터링, 데일리 루틴, 보고서 초안 작성 등)를
하나의 사내 웹 대시보드로 통합하는 프로젝트입니다.

## 기술 스택
- React + TypeScript + Vite
- Tailwind CSS (신한 네이비/블루 톤)
- React Router (라우팅) · Zustand (상태·인증)
- Recharts (차트, Phase 2+)
- 배포: Netlify (`netlify.toml` 포함)

## 실행
```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과 미리보기
```

## 접근 방법 (Phase 1 데모)
1. **사이트 게이트 비밀번호**: `shinhan` (환경변수 `VITE_SITE_PASSWORD`로 변경)
2. **회원 로그인** (데모 계정):
   - 관리자: `admin@shinhan.com` / `admin1234`
   - 애널리스트: `minji@shinhan.com` / `analyst1234`

> ⚠️ Phase 1 인증은 **클라이언트 목업**입니다. 실제 운영에서는 서버측 인증 +
> 비밀번호 해시 저장으로 반드시 교체해야 합니다. 민감정보/실데이터는 리포지토리에 넣지 마세요.

## 진행 단계 (Phase)
- [x] **Phase 1** — 프로젝트 셋업, 디자인 시스템, 인증(게이트+로그인), 레이아웃, 대시보드,
      커버리지·괴리율 읽기 전용 뷰(목업)
- [x] **Phase 2** — 커버리지 엑셀 임포트·등록/수정, 괴리율 Zustand 스토어+어댑터 패턴, Warning 배너
- [x] **Phase 3** — 데일리 에이전트 게시판 (CRUD/상태변경/필터), 업무일지·워크로드 (Recharts 시각화)
- [ ] **Phase 4** — 보고서 작성(재무 자동 로드, AI 초안, Word 내보내기, IR PDF)
- [ ] **Phase 5** — 자료실(DART/IR/리포트/국민연금), 오타 검수, Netlify 배포

## 외부 데이터 연동에 대한 중요 안내
신한 사내망 · FnGuide · 퀀티 · 신한 API · 네이버증권 · DART 등 외부 소스는
현재 직접 접근할 수 없습니다. 각 연동 지점은 **어댑터 인터페이스**로 분리하고,
Phase 1에서는 현실적인 목업 데이터(`src/data/mock.ts`)를 사용합니다.
실제 엔드포인트/API 키는 코드에 하드코딩하지 말고 환경변수(`.env`)로만 주입하세요.

## 폴더 구조
```
src/
  components/
    layout/     # AppLayout, 사이드바 네비게이션
    ui/         # Card, Badge, Button, StatTile 등 디자인 시스템
  data/mock.ts  # Phase 1 목업 데이터 (→ 어댑터로 교체 예정)
  lib/utils.ts  # 날짜·괴리율·포맷 유틸
  pages/        # 화면별 페이지
  routes/       # 인증 가드
  store/auth.ts # 게이트+로그인 상태
  types.ts      # 도메인 타입
```
