create index if not exists email_sequence_enrollments_metabolic_result_idx
on public.email_sequence_enrollments (metabolic_result_id);

create index if not exists email_sequence_sends_step_idx
on public.email_sequence_sends (step_id);
