alter table public.metabolic_results
  add column if not exists energy_level text not null default 'stable'
    check (energy_level in ('very_low', 'low', 'stable', 'high', 'very_high')),
  add column if not exists sleep_quality text not null default 'normal'
    check (sleep_quality in ('poor', 'irregular', 'normal', 'good', 'excellent')),
  add column if not exists stress_anxiety text not null default 'no'
    check (stress_anxiety in ('no', 'sometimes', 'frequent'));
