# SIRIAI PM — Design Specification
> 2026-05-11 | 구현 기준 문서

---

## 1. 설계 철학

### "업무 도구는 가구다"
좋은 의자는 앉는 순간 존재를 잊게 만든다. 도구도 마찬가지다. 화면을 보는 게 아니라 **업무를 보게** 만들어야 한다. 그러기 위해 인터페이스 자체의 시각적 무게를 최소화한다.

### 세 가지 핵심 질문
디자인 결정 앞에서 항상 이 세 가지로 판단한다.

1. **지금 뭘 봐야 하는가?** — 시선이 가장 먼저 닿아야 할 곳
2. **다음에 뭘 해야 하는가?** — 행동을 유도하는 시각적 단서
3. **방금 뭐가 바뀌었는가?** — 피드백의 명확성

---

## 2. 시각 언어 (Visual Language)

### 2.1 서피스 계층 (Surface Hierarchy)

배경색으로 깊이를 만든다. 보더(border)는 최소화.

```
─────────────────────────────────────────────────────
DEPTH 0 — 가장 깊은 곳 (배경)
  color: #eeede9   warm near-white
  역할: 메인 뷰 배경, 콘텐츠가 "떠 있는" 느낌을 주는 바닥

DEPTH 1 — 사이드바, 헤더
  color: #f8f8f6   almost white
  역할: 내비게이션 영역, 컨트롤 바

DEPTH 2 — 카드, 행, 패널 (surface)
  color: #ffffff   pure white
  역할: 캠페인 행, 상세 패널, 모달
  shadow: 0 1px 3px rgba(0,0,0,.04)

DEPTH 3 — 팝오버, 드롭다운 (floating)
  color: #ffffff
  shadow: 0 4px 16px rgba(0,0,0,.10), 0 1px 4px rgba(0,0,0,.06)
  border: 1px solid rgba(0,0,0,.08)
─────────────────────────────────────────────────────
```

### 2.2 컬러 시스템 (Color Semantics)

색상은 장식이 아니라 의미다. 한 색은 하나의 의미만 가진다.

```
─────────────────────────────────────────────────────
BLUE    #1a6fa8    "진행 중이다"
  → 모집중, 업로드 진행, 활성 선택, 링크, 포커스 링

GREEN   #2a7d4f    "완료됐다 / 좋다"
  → 업로드완료, 입금완료, 성공 토스트, 진행바 만충

AMBER   #a07020    "주의 필요, 아직 안 됨"
  → 컨펌단계, 부분입금, 7일 이내 마감

RED     #c0392b    "즉시 조치 필요"
  → 이슈, 미입금, D-2 이내, 에러

PURPLE  #6b3fa0    "재무/정산 영역"
  → 입금확인 단계, 정산 관련 UI 액센트

TEAL    #1a8a80    "상시/특수"
  → 상시 진행 캠페인

NEUTRAL #1a1a1a    "텍스트 기본"
  각 투명도로 계층 표현:
  100% — 제목, 강조
   70% — 본문, 설명
   40% — 보조, 플레이스홀더
   15% — 구분선, 배경
   06% — 호버 상태
─────────────────────────────────────────────────────
```

Phase별 컬러 매핑:

| Phase | 미완료 | 진행중 | 완료 |
|-------|-------|-------|------|
| A (납품준비) | neutral | blue | green |
| B (콘텐츠) | — | amber→green | green |
| C (정산) | neutral | purple | green |
| 이슈/긴급 | red | red | — |

### 2.3 타이포그래피 시스템

```
─────────────────────────────────────────────────────
LEVEL 0 — 페이지/패널 제목
  font-size: 15px
  font-weight: 600
  color: ink100
  line-height: 1.3

LEVEL 1 — 캠페인명 (목록에서 주인공)
  font-size: 13px
  font-weight: 500
  color: ink100
  line-height: 1.4

LEVEL 2 — 본문, 필드값
  font-size: 12px
  font-weight: 400
  color: ink100
  line-height: 1.5

LEVEL 3 — 보조 정보 (거래처, 날짜 sub)
  font-size: 11px
  font-weight: 400
  color: ink60
  line-height: 1.4

LEVEL 4 — 레이블, 뱃지, 섹션 헤더
  font-size: 10px
  font-weight: 600
  color: ink40
  letter-spacing: .06em
  text-transform: uppercase

LEVEL 5 — 극소 (카운터, 메타데이터)
  font-size: 10px
  font-weight: 400
  color: ink40

숫자 강조 (D-day, 업로드 수):
  font-variant-numeric: tabular-nums   ← 숫자 폭 일정
  font-feature-settings: "tnum"
─────────────────────────────────────────────────────
```

### 2.4 간격 시스템 (Spacing)

4px 기본 단위. 8의 배수를 주로 사용.

```
4px   — 아이콘-텍스트 사이, 뱃지 내부 패딩
8px   — 컴포넌트 내부 간격
12px  — 관련 요소 사이
16px  — 섹션 내부 패딩
20px  — 컬럼/패널 패딩
24px  — 섹션 사이 구분
32px  — 주요 영역 구분
```

### 2.5 모서리 (Border Radius)

```
4px   — 뱃지, 인라인 칩
6px   — 버튼, 인풋
8px   — 카드, 드롭다운
12px  — 모달, 패널 모서리
100px — 필약 (pill) 형태
```

### 2.6 모션 (Motion)

애니메이션은 정보다. 장식이 아니다.

```
즉각 (0ms)    — 드롭다운 옵션 hover, 상태 뱃지 hover
빠름 (100ms)  — 행 hover 배경, 토글 아이콘 회전
중간 (200ms)  — 상세 패널 슬라이드인/아웃, 토스트 진입
느림 (300ms)  — 그룹 접기/펼치기 (height 변화)

Easing:
  슬라이드인: cubic-bezier(0.2, 0, 0, 1)    — 빠르게 시작, 부드럽게 안착
  슬라이드아웃: cubic-bezier(0.4, 0, 1, 1)  — 부드럽게 시작, 빠르게 마무리
  토글: cubic-bezier(0.3, 0, 0.2, 1)        — 자연스러운 반동감
```

---

## 3. 컴포넌트 설계

### 3.1 캠페인 행 (Campaign Row) — 핵심 요소

행은 모든 것의 중심이다. 하루에 수십 번 보는 요소.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ☐  [A뱃지]  캠페인명                    거래처    [B현황]  [C뱃지]  D-7 │
│             서브: 납품예정 · 05/20                                       │
└─────────────────────────────────────────────────────────────────────────┘
높이: 52px (2행) / compact 모드: 40px (1행)
```

**그리드 컬럼 비율 (table-layout: fixed):**

```
28px  | 100px   | 1fr     | 90px  | 120px    | 88px     | 64px
check | A-phase | name    | client| B-upload | C-pay    | dday
```

**A-Phase 뱃지** (100px):
```
● 모집중           ← 6px dot + 10px text, all-uppercase, letter-spacing
색: 현재 status에 따른 semantic color
클릭: 상태 드롭다운 오픈
```

**캠페인명 컬럼** (flex):
```
TOP: 캠페인명 — 13px, weight 500, ink100
BOT: 납품 예정 05/20 · 거래처명(전체보기 시) — 11px, ink50
```

**B-업로드 현황** (120px):
```
경우 1: status 4, count_select>0
  TOP: 38/45        — 11px, tabular-nums, ink70
  BOT: ▓▓▓▓▓▓░░░░   — 3px height, 72px width, green/amber/gray

경우 2: status 4, count_select=0
  업로드중           — 11px, amber

경우 3: status 5 또는 6
  납품완료 ✓         — 11px, green, weight 600

경우 4: status 1,2,3
  —                  — ink30
```

**C-Pay 뱃지** (88px):
```
미입금              — red background, 10px, weight 600
입금완료 ✓          — green, ink style
부분입금            — amber
—                   — ink30 (해당없음 또는 Phase C 미진입)
```

**D-day** (64px, 우측 정렬):
```
D-7     → green, weight 600 (여유 있음)
D-3     → amber, weight 700 (주의)
D-2     → red, weight 700 (긴급)
D-DAY   → red, weight 800, 작은 강조
D+N     → ink30, weight 400 (지남)
```

**행 상태별 스타일:**

```
기본:       background white, border-bottom 1px ink06
hover:      background #f5f5f3, transition 80ms
selected:   background #eef4fb, border-left 2px blue
긴급행:     border-left 2px red (hover/selected 여부 무관)
완료(done): 전체 opacity 0.65, 캠페인명 ink50으로 감소
```

### 3.2 그룹 헤더 (Phase Group Header)

```
─── 납품 준비 중   7   ─────────────────────────────────── ▾
```

- 텍스트: 10px, ALL CAPS, ink40, letter-spacing .08em
- 카운트: ink30 배경의 소형 pill
- 구분선: ink08, border-top (헤더 위)
- 클릭: 접기/펼치기 토글 (300ms height animation)
- 패딩: 12px 좌우, 10px 상하

그룹별 왼쪽 액센트 색상 (subtle, 2px left border):
```
납품 준비 중:   blue
업로드 진행 중: amber  
정산 진행 중:   purple
전체 완료:      green (기본 접힘)
이슈:           red
```

### 3.3 사이드바

```
┌─ 200px ──────────────────────────────────────────────┐
│  SIRIAI PM                                  🔔 3     │  패딩 20px 16px
│                                                      │
│  ──────────────────────────────────────────────────  │  구분선
│                                                      │
│  🏠  홈                                              │  36px 높이 행
│  ☰   캠페인                                          │  현재: 활성 bg
│  📊  정산                                            │
│                                                      │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  CLIENTS                                             │  9px 레이블
│                                                      │
│  ●  무신사                              3            │  32px 행
│     올리브영                            1            │  (dot: active시 blue)
│  ⚠  에스더버니                          2            │  (⚠: 이슈/미입금)
│     틈결                                1            │
│     CJ ENM                              0            │
│                                                      │
│  + 거래처 추가                                       │  28px, ink40
│                                                      │
└──────────────────────────────────────────────────────┘
```

활성 내비 아이템:
- background: ink06 (#f0f0ee 정도)
- border-radius: 6px (내부에서)
- 텍스트: ink100, weight 500
- 아이콘: opacity 1

비활성:
- background: transparent
- 텍스트: ink60, weight 400
- 아이콘: opacity 0.5

### 3.4 필터 바 (Filter Bar)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [Phase ▾]  [정산 ▾]  [거래처 ▾]   무신사 ×   미입금 ×   [초기화]   🔍  │
└──────────────────────────────────────────────────────────────────────────┘
```

**필터 버튼** (기본 상태):
- 배경: white, border 1px ink15, radius 6px
- 텍스트: 12px, ink60
- 클릭: 팝오버 드롭다운

**필터 버튼** (활성 필터 있을 때):
- 배경: blue-bg (#eef4fb), border blue
- 텍스트: blue, weight 500

**필터 칩** (적용된 필터):
- 배경: ink08, border ink15, radius 100px
- 텍스트: 11px, ink70
- × : 클릭으로 제거

**필터 드롭다운** (팝오버):
```
┌─────────────────────────────┐
│  Phase                      │  10px 레이블
│  ○ 전체                     │  라디오 스타일 리스트
│  ● 납품 준비 중 (7)         │  현재 선택: blue dot
│  ○ 업로드 진행 중           │
│  ○ 정산 진행 중             │
│  ○ 전체 완료                │
└─────────────────────────────┘
shadow: depth 3 스타일
```

### 3.5 상세 패널 (Detail Panel)

**열림 방식**: 오른쪽에서 push (메인뷰가 좁아짐)  
**너비**: 480px  
**transition**: width 220ms cubic-bezier(0.2,0,0,1)

```
┌─ 480px ──────────────────────────────────────────────────┐
│  ✕                                          [↗ 전체화면] │  36px, ink30
├──────────────────────────────────────────────────────────┤
│  무신사 봄 캠페인 2026                                    │  15px, 600
│                                                          │  4px gap
│  ┌─ Phase Tracker ──────────────────────────────────────┐│
│  │                                                      ││  44px
│  │  [● 모집중]   ────▶   [38/45 ████░]  ────▶  [미입금] ││
│  │   A: 납품준비           B: 콘텐츠               C: 정산││
│  │                                                      ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │  8px gap
│  [진행시트 ↗]  [QA시트 ↗]  [가이드 ↗]                    │  링크 행
├──────────────────────────────────────────────────────────┤  구분선
│                                                          │
│  BASIC INFO                                              │  섹션 레이블
│  ──────────────────────────────────────────────────────  │
│  거래처      무신사                                       │  필드 행: 44px
│  담당 채널   SIRIAI                                       │
│  기간        2026/04/01 → 2026/05/18                     │
│  납품 예정일 2026/05/20                                   │
│  국가        국내                                         │
│  코드        MU-2601                                      │
│  상세 내용                                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │ (클릭하여 편집)                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ▾ UPLOAD STATUS                                         │  접기/펼치기 섹션
│  ▾ QA                                                    │
│  ▾ FINANCE                                               │
│  ▾ LINKS                                                 │
│  ▾ NOTES                                                 │
│  ▾ HISTORY                                               │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│  [아카이브]   danger ghost button, 우측 하단               │
└──────────────────────────────────────────────────────────┘
```

**Phase Tracker 컴포넌트** (상세 패널 상단):

```css
/* 세 칸짜리 행 */
.phase-tracker {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  /* phase-a | arrow | phase-b | arrow | phase-c */
  align-items: center;
  padding: 10px 20px;
  background: ink04;
  border-radius: 8px;
}

.phase-block {
  text-align: center;
}
.phase-block-label { 9px, ALL CAPS, ink40 }
.phase-block-status { 11px, weight 600, semantic color }

.phase-arrow { color: ink20; font-size: 10px; }
```

**필드 행 (상세 패널 내부)**:

```
label: 80px, 11px, ink40, flex-shrink:0
value: flex:1, 12px, ink100
       hover시 배경 ink06, cursor pointer
       editing시 inline-input 표시
```

### 3.6 홈 뷰 섹션

```
┌─ 요약 카드 4개 (grid 2x2 or 4x1) ──────────────────────────────────────┐
│  납품 준비 중     업로드 진행 중    정산 진행 중      전체 완료           │
│      7                4                3               12               │
│  (blue accent)   (amber accent)  (purple accent)  (green accent)       │
└──────────────────────────────────────────────────────────────────────────┘
```

각 카드 클릭 → 캠페인 뷰로 이동 + 해당 Phase 필터 자동 적용

```
┌─ 즉시 확인 필요 ──────────────────────────────────────────────────────────┐
│  섹션 제목: 10px ALL CAPS RED + 건수                                      │
│  [compact 행들 — 긴급 캠페인만]                                           │
│  각 행 클릭 → 상세 패널 열기                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.7 Phase Tracker (Phase A 상태 드롭다운)

Phase A 변경 시 드롭다운을 아래처럼 구성:

```
┌─ 상태 선택 ─────────────────────────────────────────┐
│  PHASE A — 납품 준비                                │  10px 레이블
│  ● 브랜드 소통                                      │
│  ● 모집중                            ← 현재         │
│  ● 컨펌 완료                                        │
│  ─────────────────────────────────────────────────  │
│  PHASE B — 콘텐츠 업로드                            │
│  ● 업로드 진행중    (Phase A 완료 필요)              │
│  ● 납품 완료        (강제 완료 처리)                 │
│  ─────────────────────────────────────────────────  │
│  특수                                               │
│  ↕ 상시 진행                                        │
│  ⚠ 이슈                                             │
└─────────────────────────────────────────────────────┘
```

선택 옵션에 Phase 그룹 헤더를 넣어 맥락을 명시한다.

### 3.8 스켈레톤 로딩

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ░░░░░░░  ░░░░░░░░░░░░░░░░░░░░░░░░░    ░░░░░░░░  ░░░░░░  ░░░  ░░░░  │
│           ░░░░░░░░░░░░                                                  │
│  ░░░░░░░  ░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░  ░░░░░░  ░░░  ░░░░  │
└─────────────────────────────────────────────────────────────────────────┘
```

shimmer 애니메이션: 1.4s, 좌→우 그라데이션 이동

---

## 4. 상호작용 패턴 (Interaction Patterns)

### 4.1 인라인 편집

```
기본: 값 텍스트 표시
hover: 텍스트 배경 ink06, 아주 옅은 편집 커서 아이콘 (오른쪽 끝)
클릭: 텍스트 → input 전환 (레이아웃 흔들림 없이)
      포커스 링: 2px blue, box-shadow glow
blur/Enter: 저장 → 텍스트로 복귀 + "저장됨" 1.5초 표시
Esc: 취소, 원래 값 복원
```

### 4.2 상태 드롭다운

```
배지 클릭 → 즉시 팝오버 (0ms 딜레이)
선택 → 팝오버 닫힘 → 배지 색상 전환 (100ms fade)
역방향 전환 → 모달 (사유 입력)
```

### 4.3 상세 패널 열기/닫기

```
캠페인행 클릭:
  → 패널이 없으면: width 0→480px, 220ms ease-out
  → 패널이 있으면: 내용만 교체 (패드 다시 슬라이드 X)

패널 닫기 (× 또는 Esc):
  → width 480→0px, 180ms ease-in

동일 캠페인 다시 클릭:
  → 토글: 열려있으면 닫힘
```

### 4.4 그룹 접기/펼치기

```
헤더 클릭:
  → height auto→0 / 0→auto, 250ms
  → 화살표 아이콘 90도 회전, 150ms
```

### 4.5 필터 적용

```
필터 드롭다운 선택:
  → 즉시 (0ms) 목록 업데이트
  → 필터 칩 추가 (100ms fade-in)
  → URL 쿼리 파라미터 업데이트 (새로고침 유지)

필터 칩 × 클릭:
  → 칩 제거 (100ms fade-out)
  → 즉시 목록 업데이트
```

### 4.6 새 캠페인

```
"+ 새 캠페인" 클릭:
  → 미니 모달 (3개 필드: 이름 + 거래처 + Phase A 상태)
  → 등록 → 모달 닫힘 → 새 캠페인행 목록 상단 추가 → 상세 패널 자동 열림
```

---

## 5. 구현 결정사항

### 5.1 레이아웃 CSS 구조

```css
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #eeede9;   /* depth 0 */
}

.sidebar {
  width: 200px;
  flex-shrink: 0;
  background: #f8f8f6;   /* depth 1 */
  border-right: 1px solid rgba(0,0,0,.07);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-scroll {
  flex: 1;
  overflow-y: auto;
}

.detail-panel {
  width: 0;
  flex-shrink: 0;
  overflow: hidden;
  background: #ffffff;
  border-left: 1px solid rgba(0,0,0,.07);
  transition: width 220ms cubic-bezier(0.2, 0, 0, 1);
}

.detail-panel.open {
  width: 480px;
}
```

### 5.2 CSS 변수 전면 재정의

```css
:root {
  /* Surface */
  --bg-deep:    #eeede9;
  --bg-mid:     #f8f8f6;
  --surface:    #ffffff;

  /* Ink */
  --ink:        #1a1a1a;
  --ink70:      rgba(26,26,26,.70);
  --ink60:      rgba(26,26,26,.60);
  --ink40:      rgba(26,26,26,.40);
  --ink20:      rgba(26,26,26,.20);
  --ink12:      rgba(26,26,26,.12);
  --ink08:      rgba(26,26,26,.08);
  --ink06:      rgba(26,26,26,.06);
  --ink04:      rgba(26,26,26,.04);

  /* Semantic */
  --blue:       #1a6fa8;
  --blue-bg:    rgba(26,111,168,.08);
  --blue-sel:   rgba(26,111,168,.10);  /* 선택 행 배경 */
  --green:      #2a7d4f;
  --green-bg:   rgba(42,125,79,.08);
  --amber:      #a07020;
  --amber-bg:   rgba(160,112,32,.08);
  --red:        #c0392b;
  --red-bg:     rgba(192,57,43,.08);
  --purple:     #6b3fa0;
  --purple-bg:  rgba(107,63,160,.08);
  --teal:       #1a8a80;
  --teal-bg:    rgba(26,138,128,.08);

  /* Phase group accent colors */
  --phase-delivery:   var(--blue);
  --phase-upload:     var(--amber);
  --phase-settlement: var(--purple);
  --phase-done:       var(--green);
  --phase-issue:      var(--red);

  /* Radius */
  --r-sm:  4px;
  --r-md:  6px;
  --r-lg:  8px;
  --r-xl:  12px;
  --r-pill: 100px;

  /* Shadow */
  --shadow-xs: 0 1px 2px rgba(0,0,0,.04);
  --shadow-sm: 0 1px 4px rgba(0,0,0,.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.04);
  --shadow-lg: 0 8px 24px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.06);
  --shadow-float: 0 4px 16px rgba(0,0,0,.10), 0 1px 4px rgba(0,0,0,.06);

  /* Motion */
  --ease-in:  cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --ease-std: cubic-bezier(0.3, 0, 0.2, 1);
}
```

### 5.3 뱃지 시스템 재설계

현재 뱃지는 배경색이 너무 진하다. 더 세련된 스타일로:

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .03em;
  white-space: nowrap;
  border: 1px solid transparent;
}

/* 상태별: 배경을 더 연하게, 텍스트/보더로 구분 */
.s-blue   { background: rgba(26,111,168,.10); color: #1a6fa8; border-color: rgba(26,111,168,.20); }
.s-green  { background: rgba(42,125,79,.10);  color: #2a7d4f; border-color: rgba(42,125,79,.20); }
.s-amber  { background: rgba(160,112,32,.10); color: #a07020; border-color: rgba(160,112,32,.20); }
.s-red    { background: rgba(192,57,43,.10);  color: #c0392b; border-color: rgba(192,57,43,.20); }
.s-purple { background: rgba(107,63,160,.10); color: #6b3fa0; border-color: rgba(107,63,160,.20); }
.s-gray   { background: rgba(26,26,26,.06);   color: #888;    border-color: rgba(26,26,26,.12); }
```

---

## 6. 검증 체크리스트

구현 후 아래를 확인한다.

**정보 위계:**
- [ ] 캠페인명이 각 행에서 시선을 가장 먼저 잡는가
- [ ] D-2 긴급 행은 목록에서 즉시 눈에 띄는가
- [ ] "납품완료 ✓" / "입금완료 ✓" 배지는 긍정적 신호로 읽히는가

**상호작용:**
- [ ] 모든 클릭 가능 요소에 hover 상태가 있는가
- [ ] 인라인 편집 후 저장 피드백이 명확한가
- [ ] 상세 패널 열림이 자연스럽고 빠른가

**일관성:**
- [ ] 같은 색은 같은 의미로만 쓰이는가 (blue = 진행중)
- [ ] 폰트 크기 5레벨 시스템이 지켜지는가
- [ ] 간격이 4px 그리드에 맞는가

**반응형:**
- [ ] 1280px: 정상
- [ ] 1024px: 사이드바 아이콘 모드 (텍스트 숨김)
- [ ] 768px: 상세 패널 전체화면 오버레이

---

## 7. 구현 상태 (2026-05-11 기준)

### ✅ 완료된 컴포넌트

| 컴포넌트 | 스펙 충족도 | 비고 |
|---------|----------|------|
| CSS 변수 (디자인 토큰) | ✅ 완전 | `--bg-deep`, `--bg-mid`, `--surface`, 시맨틱 6색 |
| 서피스 계층 3단계 | ✅ 완전 | `#eeede9` / `#f8f8f6` / `#ffffff` |
| 뱃지 시스템 | ✅ 완전 | pill, border, 연한 배경 |
| 사이드바 레이아웃 | ✅ 완전 | 200px, 아이콘 모드 (1100px↓) |
| Phase 그룹 헤더 | ✅ 완전 | left accent, 접기/펼치기 |
| 캠페인 행 (7컬럼) | ✅ 완전 | `28|96|1fr|86|116|84|60px` |
| 상태 드롭다운 | ✅ 완전 | Phase 그룹 레이블 포함 |
| 입금 드롭다운 | ✅ 완전 | 행에서 직접 변경 |
| 상세 패널 push | ✅ 완전 | `width 0→480px`, 220ms ease-out |
| Phase Tracker | ✅ 완전 | A→B→C 그리드 컴포넌트 |
| 홈 뷰 | ✅ 완전 | 요약 카드 + 즉시확인 + 업로드 + 정산 |
| 필터 바 | ✅ 부분 | Phase·정산 팝오버 ✅, 거래처 드롭다운 ⬜ |
| 모션 | ✅ 완전 | `--ease-out/in/std` 변수 정의, 패널 transition 적용 |
| 인라인 편집 | ✅ 완전 | 기존 패턴 유지 |
| 스켈레톤 로딩 | ✅ CSS | `.skeleton-row` 정의됨, JS 연결 ⬜ |

### ⬜ 미구현 / 개선 필요

| 항목 | 우선순위 |
|------|---------|
| 거래처 필터 팝오버 | 높음 |
| 768px 모바일: 상세 패널 full-screen overlay | 높음 |
| 스켈레톤 로딩 실제 적용 (로딩 시 JS 연결) | 중간 |
| URL 쿼리 파라미터 필터 상태 보존 | 중간 |
| 캠페인 행 체크박스 실제 동작 + bulk 액션 | 중간 |
| 홈 업로드 속도 부족 경고 (D-day 대비 달성률) | 중간 |
| 정산 뷰 거래처별 집계 테이블 | 낮음 |

### 스펙과 실제 구현의 차이점

- **캠페인 행 그리드**: 스펙 `28|100|1fr|90|120|88|64px` → 구현 `28|96|1fr|86|116|84|60px` (소폭 조정)
- **상세 패널 너비**: 스펙 480px → 구현 480px (CSS var `--detail-w: 480px`)
- **알림 벨 위치**: 스펙 사이드바 상단 → 구현 사이드바 하단 (더 자연스러운 배치)
- **그룹 헤더 sticky**: 스펙에 없었으나 구현에서 추가 (`position:sticky;top:0`) — UX 개선
