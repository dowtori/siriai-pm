-- ============================================================
-- SIRIAI PM — Supabase 스키마
-- Supabase SQL Editor에서 전체 복붙 후 실행
-- ============================================================

-- ── EXTENSIONS ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── ENUM 타입 ───────────────────────────────────────────────
create type campaign_status as enum (
  '1. 브랜드 소통',
  '2. 모집중',
  '3. 컨펌 단계',
  '4. 컨텐츠 업로드',
  '5. 캠페인 종료',
  '6. 입금 확인',
  '7. 상시 진행',
  '기타/이슈'
);

create type pay_status as enum (
  '미입금',
  '입금완료',
  '부분입금',
  '분쟁',
  '해당없음'
);

create type qa_status as enum (
  '검수전',
  '검수중',
  '완료',
  '이슈'
);

create type influencer_status as enum (
  '대기',
  '업로드완료',
  '지연',
  '드랍'
);

create type influencer_tier as enum (
  '나노',
  '마이크로',
  '미들',
  '메가'
);

-- ── CLIENTS (거래처) ────────────────────────────────────────
create table clients (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null unique,
  contact       text,
  contract_type text default '직발주',  -- '직발주' | '대행사경유'
  note          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── CAMPAIGNS (캠페인) ──────────────────────────────────────
create table campaigns (
  id            uuid primary key default uuid_generate_v4(),
  uv            text,                          -- '260202' 형식, nullable (일부 누락)
  status        campaign_status not null default '1. 브랜드 소통',
  name          text not null,
  detail        text,
  entity        text default 'SIRIAI',          -- 진행사 자유텍스트
  country       text default '국내',             -- '국내' | '해외'
  client_id     uuid references clients(id) on delete set null,
  client_name   text,                           -- 비정규화 (빠른 조회용)

  -- 링크
  link_recruit  text,
  link_response text,
  link_guide    text,
  link_progress text,
  link_qa       text,

  -- 날짜
  date_start    date,
  date_end      date,
  date_delivery date,

  -- 수량 (인플루언서 테이블 없을 때 수동 입력)
  count_provide integer default 0,
  count_select  integer default 0,
  count_upload  integer default 0,

  -- QA
  qa_status     qa_status default '검수전',
  qa_note       text,
  qa_updated_at timestamptz,

  -- 재무
  revenue       bigint default 0,    -- 원
  fee           bigint default 0,    -- 원고료
  date_quote    date,                -- 견적서 발행일
  date_tax      date,                -- 세금계산서 발행일
  pay_status    pay_status default '미입금',

  -- 메타
  note          text,
  is_archived   boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── INFLUENCERS (인플루언서) ────────────────────────────────
create table influencers (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  handle        text,                           -- @인스타그램 핸들
  name          text,
  tier          influencer_tier,
  followers     integer,
  shipped_at    date,
  received      boolean default false,
  upload_due    date,
  uploaded_at   date,
  content_url   text,
  status        influencer_status default '대기',
  fee           integer default 0,
  note          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── CHANGE_LOGS (변경 이력) ─────────────────────────────────
create table change_logs (
  id            uuid primary key default uuid_generate_v4(),
  entity_type   text not null,    -- 'campaign' | 'influencer'
  entity_id     uuid not null,
  entity_name   text,             -- 빠른 표시용
  field         text not null,
  old_value     text,
  new_value     text,
  changed_at    timestamptz default now(),
  changed_by    text default 'system'
);

-- ── INDEXES ────────────────────────────────────────────────
create index idx_campaigns_status     on campaigns(status);
create index idx_campaigns_client_id  on campaigns(client_id);
create index idx_campaigns_date_end   on campaigns(date_end);
create index idx_campaigns_archived   on campaigns(is_archived);
create index idx_campaigns_pay_status on campaigns(pay_status);
create index idx_influencers_campaign on influencers(campaign_id);
create index idx_change_logs_entity   on change_logs(entity_type, entity_id);

-- ── UPDATED_AT 트리거 ───────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_campaigns_updated
  before update on campaigns
  for each row execute function update_updated_at();

create trigger trg_clients_updated
  before update on clients
  for each row execute function update_updated_at();

create trigger trg_influencers_updated
  before update on influencers
  for each row execute function update_updated_at();

-- ── RLS (Row Level Security) ────────────────────────────────
-- 현재 단계: anon key로 전체 접근 허용 (4명 내부 팀)
-- 나중에 auth.uid() 기반으로 교체 가능

alter table clients      enable row level security;
alter table campaigns    enable row level security;
alter table influencers  enable row level security;
alter table change_logs  enable row level security;

create policy "allow_all_clients"     on clients     for all using (true) with check (true);
create policy "allow_all_campaigns"   on campaigns   for all using (true) with check (true);
create policy "allow_all_influencers" on influencers for all using (true) with check (true);
create policy "allow_all_logs"        on change_logs for all using (true) with check (true);

-- ── 완료 ───────────────────────────────────────────────────
-- 스키마 생성 완료.
-- 다음: migrate/seed.js 를 브라우저 콘솔에서 실행하여 초기 데이터 삽입.
