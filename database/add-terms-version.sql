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

alter table public.metabolic_results
add column if not exists terms_version text not null default '2026-05-14-v1';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'metabolic_results_terms_version_fkey'
  ) then
    alter table public.metabolic_results
    add constraint metabolic_results_terms_version_fkey
    foreign key (terms_version) references public.terms_versions(version);
  end if;
end $$;

alter table public.terms_versions enable row level security;

create index if not exists metabolic_results_terms_version_idx
on public.metabolic_results (terms_version);
