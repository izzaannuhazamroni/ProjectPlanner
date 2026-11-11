-- ============================================================
-- Skema database Project Planner & WhatsApp Notification
-- Jalankan seluruh isi file ini di Supabase:
--   Dashboard -> SQL Editor -> New query -> tempel -> Run
-- Aman dijalankan berulang kali (idempotent).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tabel proyek ----------
create table if not exists public.projects (
  id                    uuid primary key default gen_random_uuid(),
  name                  text        not null check (char_length(name) between 1 and 150),
  description           text        not null default '',
  deadline              timestamptz not null,
  progress              integer     not null default 0 check (progress between 0 and 100),
  status                text        not null default 'todo'
                                    check (status in ('todo', 'in_progress', 'completed')),
  whatsapp_number       text        not null,
  reminder_h1_sent      boolean     not null default false,
  reminder_overdue_sent boolean     not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists projects_deadline_idx on public.projects (deadline);
create index if not exists projects_status_idx   on public.projects (status);

-- ---------- Log pengiriman WhatsApp ----------
create table if not exists public.notification_logs (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid        not null references public.projects (id) on delete cascade,
  phone         text        not null,
  type          text        not null check (type in ('manual', 'h1', 'overdue')),
  message       text        not null,
  status        text        not null check (status in ('sent', 'failed')),
  error_message text,
  created_at    timestamptz not null default now()
);

create index if not exists notification_logs_project_idx
  on public.notification_logs (project_id, created_at desc);

-- ---------- Penyimpanan sesi WhatsApp (Baileys) ----------
create table if not exists public.wa_auth (
  key        text primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);

-- ---------- Trigger updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------- Keamanan (Row Level Security) ----------
-- RLS diaktifkan TANPA policy publik: tabel tidak bisa diakses lewat anon key dari browser.
-- Backend memakai service_role key yang otomatis melewati RLS.
alter table public.projects          enable row level security;
alter table public.notification_logs enable row level security;
alter table public.wa_auth           enable row level security;
