# SIRIAI PM — Product Requirements Document

**버전:** v0.2  
**작성일:** 2026-05-04  
**상태:** 확정 (구현 준비)

---

## 변경 이력

| 버전 | 날짜 | 주요 변경 |
|------|------|-----------|
| v0.1 | 2026-05-04 | 초안 |
| v0.2 | 2026-05-04 | 미결 사항 반영. QA 범위 축소, 멀티유저 즉시 대응, 아키텍처 확정 |

---

## 1. 개요

SIRIAI의 캠페인 운영을 구글 시트에서 전용 PM 시스템으로 이전한다.  
단순한 데이터 조회·이동이 아닌, **실제 운영 행위 자체가 이 시스템에서 발생**하는 것을 목표로 한다.

**범위 경계 (확정)**
- **이 시스템**: SIRIAI 내부 운영 전용. 캠페인 생애주기, 인플루언서 추적, 재무 관리.
- **계속 시트 운영**: 브랜드사에 공유하는 납품 시트 (콘텐츠 검수 외부 협업 영역)
- **피처링 보고서**: 외부 피처링 서비스에서 처리, 이 시스템 범위 외

---

## 2. 문제 정의

### 현재 구글 시트의 한계

| 영역 | 문제 |
|------|------|
| **상태 관리** | 8단계 파이프라인이 자유 텍스트로 관리되어 실수·오입력 발생 |
| **인플루언서 추적** | 선정 수·업로드 수만 집계, 개별 인플루언서 상태는 별도 시트에 산재 |
| **재무 관리** | 견적서·세금계산서·입금 상태가 비정형적, 월별 집계 수작업 |
| **알림** | D-day·미입금·업로드 지연 알림 없음, 수작업 확인 |
| **팀 협업** | 4명이 동시에 작업하지만 데이터 충돌·버전 불일치 발생 |
| **접근성** | 모바일에서 스프레드시트 조작 어려움 |
| **히스토리** | 변경 이력 없음 |

### 데이터 현황 (2026년 기준)
- 활성 캠페인: **66건** + 완료·종료 별도 (전체 이관)
- 주요 거래처: 무신사 28건(42%), 기타 21개사
- SIRIAI 직접 운영: **56건**, 타대행 협력: **10건**
- QA 시트 연결 비율: **33/66 (50%)**
- 누적 매출: **1억 5,306만원**, 순이익: **8,680만원 (마진 56.7%)**

---

## 3. 목표

1. **4명 팀이 같은 데이터를 실시간으로 공유·수정**
2. **캠페인 생애주기 전체를 이 시스템에서 운영** — 등록부터 입금 확인까지
3. **재무 데이터 자동 집계** — 월별·거래처별 매출/이익 상시 최신 상태
4. **운영 알림** — D-day, 업로드 지연, 미입금 자동 감지

### 성공 지표
- 구글 시트 열람 횟수 → 0 (납품 시트 제외)
- 캠페인 상태 오입력 → 0 (선택형 전환으로 강제)
- 월말 정산 소요 시간 → 30분 이내

---

## 4. 사용자 (4명)

| 역할 | 주요 업무 | 사용 빈도 |
|------|-----------|----------|
| **PM** | 캠페인 등록, 상태 진행, 인플루언서 관리 | 매일 |
| **PM** | 동일 | 매일 |
| **정산 담당** | 견적서 발행, 입금 확인, 월별 집계 | 주 1~2회 |
| **디렉터** | 전체 현황 대시보드, 거래처별 실적 | 필요 시 |

> 현 단계에서 권한 분리 없음. 4명 전원 동일 권한. 추후 필요 시 추가.

---

## 5. 기능 요구사항

### 5-1. 캠페인 관리 (CRUD)

**5-1-1. 캠페인 등록**
- 폼 필드: 캠페인명, 거래처, 진행사(자유텍스트), 국가, 제품 상세, 시작일·마감일·납품예정일, 링크 4개(모집/가이드/진행시트/QA시트), 제공 수, 비고
- UV 자동 부여: YYMMDD + 시퀀스 (예: 260504-01)
- **캠페인 템플릿**: 무신사, 무가시딩 등 반복 패턴 프리셋
- 저장 즉시 팀 전체에 실시간 반영

**5-1-2. 인라인 편집**
- 테이블의 모든 필드 클릭 즉시 편집
- 변경 자동 저장 + 타임스탬프 기록
- 날짜: 달력 피커 / 숫자: 스피너

**5-1-3. 삭제 / 아카이브**
- 소프트 삭제 (아카이브 이동), 복원 가능
- 하드 삭제: 2단계 확인

---

### 5-2. 파이프라인 관리

**상태 단계 (8단계)**

```
1. 브랜드 소통 → 2. 모집중 → 3. 컨펌 단계 → 4. 컨텐츠 업로드
                                                      ↓
                               6. 입금 확인 ← 5. 캠페인 종료
                                     ↑
                               7. 상시 진행 (별도 루프)
                               기타/이슈 (어느 단계에서든 전환 가능)
```

- 상태 변경: 드롭다운 또는 칸반 드래그만 허용 (자유 입력 금지)
- 역방향 전환: 사유 메모 필수 입력
- '기타/이슈' 전환: 이슈 내용 필수 + 알림 플래그 생성
- 상태 변경 이력 전부 기록 (언제, 이전→이후)

**칸반 뷰**
- 8개 컬럼, 카드 드래그로 상태 이동
- 카드 표시: 캠페인명, 거래처, D-day, 업로드율
- 컬럼별 건수 + 합산 매출

---

### 5-3. 인플루언서 추적

**5-3-1. 캠페인별 인플루언서 하위 데이터**

| 필드 | 비고 |
|------|------|
| 인플루언서명 / 계정명 | |
| 인스타그램 @핸들 | 링크 자동 생성 |
| 팔로워 수 / 등급 | 나노/마이크로/미들/메가 |
| 제품 발송일 / 수령 확인 | |
| 업로드 예정일 / 실제일 | |
| 콘텐츠 URL | |
| 상태 | 대기/업로드완료/지연/드랍 |
| 원고료 | 자동 합산 → 캠페인 원고료 |
| 비고 | |

**5-3-2. 구글 시트 가져오기**
- 공개 구글 시트 URL 입력 → CSV export URL로 자동 변환하여 파싱
- 컬럼 매핑 UI: 시트 열 ↔ 시스템 필드 연결 (1회 설정 후 저장)
- 가져오기 후 수동 편집 가능
- 조건: 시트가 "링크 있는 모든 사용자" 공개 상태여야 함

**5-3-3. 집계 자동화**
- 선정 수 / 업로드 수 / 지연 수: 인플루언서 리스트에서 자동 집계
- 업로드율 실시간 반영
- 업로드 예정일 초과 시 자동 지연 플래그

---

### 5-4. QA 관리 (단순화)

> 납품 시트(브랜드사 공유)는 계속 구글 시트 운영. 이 시스템의 QA는 SIRIAI 내부 추적에 한정.

**5-4-1. 캠페인 단위 QA 추적**
- QA 시트 링크 (외부 구글 시트 연결)
- QA 상태: 검수전 / 검수중 / 완료 / 이슈
- 검수 메모 (자유텍스트)
- 마지막 업데이트 시각

**5-4-2. QA 대시보드**
- 전체 캠페인 QA 상태 현황 (검수전 N / 검수중 N / 완료 N / 이슈 N)
- 검수 필요 캠페인 목록 (상태 = '4. 컨텐츠 업로드' 이상)

---

### 5-5. 재무 관리

**5-5-1. 캠페인 재무**
- 매출(입금예정액), 원고료, 순이익(자동 계산), 마진율(자동)
- 견적서 발행일, 세금계산서 발행일
- 입금 상태: 미입금 / 입금완료 / 부분입금 / 분쟁

**5-5-2. 월별 정산 뷰**
- 이번 달 매출 / 순이익 / 진행 건수
- 거래처별 집계 테이블
- 전월 대비 증감
- 연간 누적 차트 (월별 막대)

**5-5-3. 미입금 관리**
- 입금 예정일 초과 자동 플래그
- 미입금 합계 상단 상시 노출
- 세금계산서 발행 여부 체크

**5-5-4. 내보내기**
- 기간 정산 내역 CSV 다운로드

---

### 5-6. 알림 패널

대시보드 상단 상시 노출:

| 알림 유형 | 기준 |
|-----------|------|
| D-3 이내 마감 | 마감일까지 3일 이하, 미종료 캠페인 |
| 업로드 지연 | 업로드 예정일 초과 인플루언서 |
| QA 이슈 | QA 상태 = '이슈' 캠페인 |
| 미입금 | 입금 예정일 초과 캠페인 |
| 기타/이슈 | 상태 = '기타/이슈' 캠페인 |

---

### 5-7. 거래처 관리

**5-7-1. 클라이언트 프로필**
- 거래처명, 담당자, 연락처, 계약 유형
- 누적 캠페인 수, 누적 매출, 평균 마진율 (자동 집계)
- 캠페인 히스토리

**5-7-2. 무신사 빠른 접근**
- 무신사 전용 필터 버튼 (볼륨 42% 고려)

---

### 5-8. 검색 & 필터

- 전체 텍스트 검색: 캠페인명, 거래처, 제품명, 비고, 인플루언서명
- 복합 필터: 상태 + 거래처 + 진행사 + 국가 + 날짜 범위 + 입금 상태
- URL 쿼리스트링에 필터 상태 반영 (공유 가능)

---

### 5-9. 데이터 마이그레이션 (초기 1회)

**이관 대상**
- 활성 캠페인 시트 (66건)
- 완료·종료 모음 시트 (전체)
- 무신사만 모음 시트 (중복 제거 후 통합)

**이관 방법**
- 기존 `_data.js` (66건) → Supabase 테이블 INSERT
- 완료 시트: 별도 Python 스크립트로 추출 후 INSERT

---

## 6. 데이터 모델

```sql
-- 거래처
clients
  id            uuid PK
  name          text NOT NULL
  contact       text
  contract_type text        -- '직발주' | '대행사경유'
  created_at    timestamptz

-- 캠페인
campaigns
  id            uuid PK
  uv            text UNIQUE  -- '260202' 형식
  status        text NOT NULL  -- 8개 상태 Enum
  name          text NOT NULL
  detail        text
  entity        text         -- 진행사 자유텍스트 (SIRIAI, 노이즈앤피치 대행 등)
  country       text         -- '국내' | '해외'
  client_id     uuid FK → clients.id
  link_recruit  text
  link_response text
  link_guide    text
  link_progress text
  link_qa       text
  date_start    date
  date_end      date
  date_delivery date
  note          text
  revenue       integer      -- 원
  fee           integer      -- 원고료
  date_quote    date         -- 견적서 발행일
  date_tax      date         -- 세금계산서 발행일
  pay_status    text         -- '미입금' | '입금완료' | '부분입금' | '분쟁'
  qa_status     text         -- '검수전' | '검수중' | '완료' | '이슈'
  qa_note       text
  is_archived   boolean DEFAULT false
  created_at    timestamptz
  updated_at    timestamptz

-- 인플루언서 (캠페인 하위)
influencers
  id            uuid PK
  campaign_id   uuid FK → campaigns.id
  handle        text         -- @인스타그램
  name          text
  tier          text         -- '나노' | '마이크로' | '미들' | '메가'
  followers     integer
  shipped_at    date
  received      boolean
  upload_due    date
  uploaded_at   date
  content_url   text
  status        text         -- '대기' | '업로드완료' | '지연' | '드랍'
  fee           integer
  note          text
  created_at    timestamptz

-- 변경 이력
change_logs
  id            uuid PK
  entity_type   text         -- 'campaign' | 'influencer'
  entity_id     uuid
  field         text
  old_value     text
  new_value     text
  changed_at    timestamptz
  changed_by    text         -- 나중에 user_id로 교체
```

**계산 필드 (DB 저장 안 함, 항상 실시간 계산)**
- `profit` = `revenue - fee`
- `margin_rate` = `profit / revenue`
- `count_select` = `count(influencers WHERE status != '드랍')`
- `count_upload` = `count(influencers WHERE uploaded_at IS NOT NULL)`
- `upload_rate` = `count_upload / count_select`
- `d_day` = `date_end - today()`

---

## 7. UI/UX 구조

### 레이아웃

```
┌─ 상단바 (sticky) ─────────────────────────────────────────────┐
│  SIRIAI · PM   [검색]   [🔔 알림 N]           2026-05-04     │
├─ 사이드바(고정) ──┬─ 메인 영역 ───────────────────────────────┤
│  대시보드        │  [탭: 전체|진행중|칸반|QA|정산|완료]        │
│  캠페인          │  [요약 카드 4개]                           │
│  QA 검수        │  [필터 바]                                 │
│  정산            │  ─────────────────────────────────────── │
│  거래처          │  [테이블 / 칸반]                          │
│  ───            │                      [캠페인 상세 드로어→] │
│  설정            │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

### 핵심 인터랙션

| 패턴 | 구현 |
|------|------|
| 인라인 편집 | 셀 클릭 → 즉시 편집 → 포커스 아웃 시 자동 저장 |
| 상태 전환 | 배지 클릭 → 드롭다운 8개 → 역방향 시 사유 모달 |
| 캠페인 상세 | 행 클릭 → 우측 슬라이드 드로어 |
| 인플루언서 | 드로어 내 탭 |
| 알림 | 상단바 벨 클릭 → 드롭다운 패널 |
| 구글 시트 가져오기 | URL 붙여넣기 → 컬럼 매핑 → 가져오기 |

### 반응형
- 데스크톱 1280px+: 사이드바 + 넓은 테이블
- 태블릿 768px: 사이드바 축소
- 모바일 360px: 하단 탭, 카드 뷰

---

## 8. 기술 아키텍처 (확정)

### 스택

| 레이어 | 기술 | 이유 |
|--------|------|------|
| **프론트엔드** | Vanilla HTML/CSS/JS | 빌드 도구 없이 배포 가능, 팀 접근성 |
| **데이터베이스** | Supabase (PostgreSQL) | 실시간 동기화, 무료 티어, PostgREST API |
| **배포** | Vercel (정적) | 즉시 배포, HTTPS, 커스텀 도메인 |
| **Google Sheets 읽기** | CSV Export URL 파싱 | OAuth 없이 공개 시트 읽기 가능 |

### 파일 구조

```
siriai-pm/
├── index.html          ← 진입점
├── app/
│   ├── main.js         ← 앱 초기화
│   ├── store.js        ← Supabase 클라이언트 + 데이터 레이어
│   ├── router.js       ← 탭/뷰 라우팅
│   ├── views/
│   │   ├── dashboard.js
│   │   ├── campaigns.js
│   │   ├── kanban.js
│   │   ├── qa.js
│   │   ├── finance.js
│   │   └── clients.js
│   └── components/
│       ├── drawer.js       ← 캠페인 상세 드로어
│       ├── table.js        ← 공통 테이블
│       ├── inline-edit.js  ← 인라인 편집
│       └── notifications.js
├── style.css
├── migrate/
│   ├── initial-data.js     ← _data.js → Supabase 마이그레이션 스크립트
│   └── completed.js        ← 완료 캠페인 마이그레이션
└── PRD.md
```

### Supabase 연결

```javascript
// store.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 실시간 구독 (4명 동시 작업 시 자동 반영)
supabase
  .channel('campaigns')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, 
      payload => store.refresh())
  .subscribe()
```

### Google Sheets CSV 파싱

```javascript
// 공개 시트 URL → CSV export URL 변환
function sheetUrlToCsv(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return null
  const id = match[1]
  const gidMatch = url.match(/gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
}

async function importFromSheet(url) {
  const csvUrl = sheetUrlToCsv(url)
  const res = await fetch(csvUrl)
  const text = await res.text()
  return parseCSV(text)  // → 컬럼 매핑 UI로 전달
}
```

---

## 9. 구현 단계

### Phase 1 — 팀 운영 가능한 MVP (우선)

**목표**: 4명이 바로 같은 데이터로 실제 운영 시작 가능

| 작업 | 설명 |
|------|------|
| Supabase 스키마 생성 | campaigns, clients, influencers, change_logs |
| 데이터 마이그레이션 | 66건 활성 + 완료·종료 시트 전체 |
| 프론트엔드 리빌드 | 인라인 편집, CRUD, 실시간 동기화 |
| 파이프라인 전환 | 드롭다운 8단계, 역방향 사유 모달 |
| 알림 패널 | D-day, 미입금, 이슈 |
| 월별 정산 뷰 | 매출/이익 집계 |
| Vercel 배포 | HTTPS, 팀 공유 URL |

### Phase 2 — 인플루언서 레이어

| 작업 | 설명 |
|------|------|
| 인플루언서 CRUD | 캠페인 드로어 내 탭 |
| Google Sheets 가져오기 | CSV URL 파싱 + 컬럼 매핑 |
| 업로드 추적 자동화 | 지연 플래그, 업로드율 자동 집계 |
| 칸반 뷰 | 드래그앤드롭 상태 이동 |

### Phase 3 — 고도화

| 작업 | 설명 |
|------|------|
| 변경 이력 전체 UI | 타임라인 뷰 |
| 거래처 프로필 페이지 | 히스토리, 실적 집계 |
| CSV 정산 내보내기 | 기간 필터 |
| 인증 (선택) | Google 로그인, 필요 시 |

---

## 10. 미결 → 확정 사항

| # | 질문 | 답변 | 반영 |
|---|------|------|------|
| 1 | 인플루언서 데이터 가져오기 가능? | 가능 | Google Sheets CSV URL 방식 |
| 2 | 무신사 연동? | 수동 입력 | 별도 처리 없음 |
| 3 | QA 구조? | 링크만, 납품은 시트 운영 | QA = 링크 + 상태 + 메모로 단순화 |
| 4 | 클라이언트 보고서? | 피처링 서비스 이용 | 시스템 범위 외 |
| 5 | 팀 인원? | 4명 | Supabase 실시간 동기화 즉시 적용 |
| 6 | 타대행 분류? | 진행사 분류 가능하면 됨 | '진행사' 자유텍스트 필드로 대체 |
| + | 완료 캠페인 이관? | 이관 | 히스토리 포함 전체 이관 |
| + | 멀티유저 타이밍? | 즉시 | Phase 1부터 Supabase + Vercel |
| + | 인플루언서 가져오기 방식? | Google Sheets URL | CSV export 파싱 |

---

*이 PRD는 살아있는 문서입니다. 운영하면서 우선순위와 스펙을 계속 갱신합니다.*
