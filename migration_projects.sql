-- ================================================================
-- MIGRATION: Projects table + link contracts to projects
-- Run this ONCE in your Supabase SQL Editor
-- ================================================================

-- 1. Create projects table
create table if not exists public.projects (
  id          uuid        default gen_random_uuid() primary key,
  name        text        not null,
  description text,
  budget      numeric,
  currency    text        not null default 'EUR',
  start_date  date,
  end_date    date,
  status      text        not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  constraint projects_status_check check (status in ('active','completed','on_hold'))
);

-- 2. Migrate existing project names from contracts.project text field
insert into public.projects (name)
select distinct trim(project)
from   public.contracts
where  project is not null and trim(project) != ''
on conflict do nothing;

-- 3. Add project_id FK to contracts (nullable, safe for existing rows)
alter table public.contracts
  add column if not exists project_id uuid references public.projects(id) on delete set null;

-- 4. Back-fill project_id for existing contracts via name match
update public.contracts c
set    project_id = p.id
from   public.projects p
where  trim(c.project) = p.name
  and  c.project_id is null;

-- 5. RLS
alter table public.projects enable row level security;

drop policy if exists "projects_service_role" on public.projects;
create policy "projects_service_role" on public.projects
  for all to service_role using (true) with check (true);

drop policy if exists "projects_authenticated" on public.projects;
create policy "projects_authenticated" on public.projects
  for all to authenticated using (true) with check (true);
