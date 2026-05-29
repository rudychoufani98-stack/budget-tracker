-- ================================================================
-- MIGRATION: Project Sections table
-- Run this ONCE in your Supabase SQL Editor
-- ================================================================

create table if not exists public.project_sections (
  id          uuid        default gen_random_uuid() primary key,
  project_id  uuid        not null references public.projects(id) on delete cascade,
  name        text        not null,
  description text,
  budget      numeric,
  currency    text        not null default 'USD',
  start_date  date,
  end_date    date,
  status      text        not null default 'active',
  created_at  timestamptz not null default now(),
  constraint sections_status_check check (status in ('active','completed','on_hold'))
);

alter table public.contracts
  add column if not exists section_id uuid references public.project_sections(id) on delete set null;

alter table public.project_sections enable row level security;
create policy "sections_all" on public.project_sections for all using (true) with check (true);
