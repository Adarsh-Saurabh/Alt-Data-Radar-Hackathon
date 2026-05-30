create extension if not exists "pgcrypto";

create table if not exists public.company_signals (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  ticker text not null,
  open_roles integer not null default 0,
  engineering_roles integer not null default 0,
  enterprise_price integer,
  web_traffic_index integer not null default 50,
  health_score integer not null check (health_score between 0 and 100),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  synthesis_alert text not null,
  created_at timestamptz not null default now()
);

create index if not exists company_signals_company_created_idx
  on public.company_signals (company_name, created_at desc);

alter table public.company_signals enable row level security;

create policy "Public read company signals"
  on public.company_signals
  for select
  using (true);
