create extension if not exists pgcrypto;

create table if not exists public.terms_versions (
  version text primary key,
  title text not null,
  content text not null,
  effective_from timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.terms_versions (version, title, content, active)
values (
  '2026-05-14-v1',
  'Terminos y privacidad v1',
  'Textos provisionales de politica de privacidad, terminos y tratamiento de datos aceptados en la calculadora de edad metabolica.',
  true
)
on conflict (version) do nothing;

create table if not exists public.metabolic_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  sex text not null check (sex in ('male', 'female')),
  chronological_age smallint not null check (chronological_age between 14 and 90),
  weight_kg numeric(6, 2) not null check (weight_kg > 0),
  height_cm numeric(6, 2) not null check (height_cm > 0),
  activity text not null check (activity in ('sedentary', 'light', 'moderate', 'active', 'athlete')),
  energy_level text not null default 'stable' check (energy_level in ('very_low', 'low', 'stable', 'high', 'very_high')),
  sleep_quality text not null default 'normal' check (sleep_quality in ('poor', 'irregular', 'normal', 'good', 'excellent')),
  stress_anxiety text not null default 'no' check (stress_anxiety in ('no', 'sometimes', 'frequent')),
  metabolic_age smallint not null check (metabolic_age between 14 and 90),
  age_delta smallint not null,
  bmr numeric(8, 2) not null,
  bmi numeric(5, 2) not null,
  tdee numeric(8, 2) not null,
  water_l numeric(5, 2) not null,
  body_score smallint not null check (body_score between 0 and 100),
  activity_score smallint not null check (activity_score between 0 and 100),
  vitality_score smallint not null check (vitality_score between 0 and 100),
  result_badge text not null,
  result_title text not null,
  result_text text not null,
  consent_accepted boolean not null default true,
  terms_version text not null default '2026-05-14-v1' references public.terms_versions(version),
  email_sent boolean not null default false,
  resend_email_id text,
  email_error text,
  user_agent text
);

alter table public.metabolic_results enable row level security;
alter table public.terms_versions enable row level security;

create index if not exists metabolic_results_created_at_idx on public.metabolic_results (created_at desc);
create index if not exists metabolic_results_email_idx on public.metabolic_results (email);
create index if not exists metabolic_results_terms_version_idx on public.metabolic_results (terms_version);
