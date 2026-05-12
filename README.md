# SIRIAI PM

SIRIAI 캠페인 운영 전용 프로젝트 관리 시스템.

---

## 셋업 (10분)

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) → New Project 생성
2. Project Settings > API 탭 진입
3. **Project URL** 과 **anon public key** 복사

### 2. config.js 수정

```js
const CONFIG = {
  SUPABASE_URL: 'https://xxxx.supabase.co',   // ← 교체
  SUPABASE_KEY: 'eyJhbGci...',                 // ← 교체
};
```

### 3. DB 스키마 생성

Supabase 대시보드 > SQL Editor에서 `migrate/schema.sql` 전체 실행.

### 4. 초기 데이터 마이그레이션 (1회)

`migrate/seed.html`을 브라우저에서 열고 **"마이그레이션 시작"** 클릭.  
> Supabase 설정 완료 후 실행. 중복 실행 금지.

### 5. Vercel 배포

```bash
# Vercel CLI 설치 (없으면)
npm i -g vercel

# 이 폴더에서 배포
cd siriai-pm
vercel --prod
```

또는 Vercel 대시보드에서 `siriai-pm` 폴더를 드래그앤드롭.

**Environment Variables** 설정 (Vercel 프로젝트 > Settings > Env):
- 필요 없음 (config.js에 직접 값이 있음)  
  > 보안 강화가 필요하면 config.js를 vercel.json의 env 변수로 이전 가능

---

## 파일 구조

```
siriai-pm/
├── index.html        ← 진입점
├── style.css         ← 스타일
├── config.js         ← Supabase 설정 (여기만 수정)
├── store.js          ← 데이터 레이어 (Supabase CRUD + 실시간)
├── app.js            ← 앱 로직 (뷰, 컴포넌트)
├── migrate/
│   ├── schema.sql    ← DB 스키마 (1회 실행)
│   ├── seed.html     ← 초기 데이터 마이그레이션 UI (1회 실행)
│   └── seed_data.json← 엑셀에서 추출한 초기 데이터
└── PRD.md
```

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 캠페인 CRUD | 등록/수정/아카이브, 인라인 편집 |
| 파이프라인 | 8단계 상태 전환, 역방향 사유 기록 |
| QA 추적 | 검수 상태 + 메모 + 외부 시트 링크 |
| 정산 | 월별/거래처별 집계, 미입금 관리, CSV 내보내기 |
| 알림 | D-day, 미입금, QA 이슈 실시간 알림 |
| 실시간 동기화 | Supabase Realtime — 4명 동시 작업 반영 |

---

## 인플루언서 Google Sheets 가져오기

캠페인 상세 드로어 > 인플루언서 탭에서:
1. 응답 구글 시트 URL 입력
2. 시트가 **"링크 있는 모든 사용자"** 공개 상태여야 함
3. 컬럼 매핑 후 가져오기

---

## 향후 계획 (Phase 2+)

- 인플루언서 탭 (1인별 업로드 추적)
- 칸반 뷰 (드래그앤드롭)
- 거래처 프로필 페이지
- Google 로그인 (멀티유저 권한)
