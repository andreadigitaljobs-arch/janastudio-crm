-- The mobile/desktop "Diagnóstico Capilar" view is being redesigned into a full
-- dashboard (condition bars, scalp health donut, observations checklist) that
-- needs richer per-diagnosis data than the original hair_type/porosity/
-- scalp_condition/chemical_history/recommended_treatment/notes/images fields.
-- Additive only — nothing existing is dropped or renamed.

alter table janastudio.capillary_diagnoses
  add column if not exists elasticity text default 'Buena',
  add column if not exists overall_score numeric(3,1) default 7.5,
  add column if not exists hydration_pct smallint default 70,
  add column if not exists nutrition_pct smallint default 60,
  add column if not exists repair_pct smallint default 50,
  add column if not exists shine_pct smallint default 80,
  add column if not exists strength_pct smallint default 70,
  add column if not exists scalp_oil_level text default 'Normal',
  add column if not exists scalp_sensitivity text default 'Baja',
  add column if not exists scalp_flaking text default 'No',
  add column if not exists scalp_hairloss text default 'Leve',
  add column if not exists scalp_inflammation text default 'No',
  add column if not exists scalp_health_pct smallint default 70,
  add column if not exists observations text[] not null default '{}'::text[];
