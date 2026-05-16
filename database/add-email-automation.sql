create table if not exists public.email_sequences (
  id uuid primary key default gen_random_uuid(),
  sequence_key text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.email_sequences(id) on delete cascade,
  step_key text not null,
  step_order integer not null check (step_order > 0),
  delay_days integer not null check (delay_days >= 0),
  subject text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sequence_id, step_key)
);

create table if not exists public.email_sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.email_sequences(id) on delete cascade,
  metabolic_result_id uuid references public.metabolic_results(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'completed', 'unsubscribed', 'cancelled')),
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  unsubscribed_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sequence_id, email)
);

create table if not exists public.email_sequence_sends (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.email_sequence_enrollments(id) on delete cascade,
  step_id uuid references public.email_sequence_steps(id) on delete set null,
  step_key text not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'error', 'skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  resend_email_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, step_key)
);

alter table public.email_sequences enable row level security;
alter table public.email_sequence_steps enable row level security;
alter table public.email_sequence_enrollments enable row level security;
alter table public.email_sequence_sends enable row level security;

create index if not exists email_sequences_sequence_key_idx on public.email_sequences (sequence_key);
create index if not exists email_sequence_steps_sequence_id_idx on public.email_sequence_steps (sequence_id, step_order);
create index if not exists email_sequence_enrollments_status_idx on public.email_sequence_enrollments (sequence_id, status, started_at);
create index if not exists email_sequence_enrollments_email_idx on public.email_sequence_enrollments (email);
create index if not exists email_sequence_enrollments_unsubscribe_token_idx on public.email_sequence_enrollments (unsubscribe_token);
create index if not exists email_sequence_sends_enrollment_idx on public.email_sequence_sends (enrollment_id, status);
create index if not exists email_sequence_enrollments_metabolic_result_idx on public.email_sequence_enrollments (metabolic_result_id);
create index if not exists email_sequence_sends_step_idx on public.email_sequence_sends (step_id);
