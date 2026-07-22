-- Final targets
UPDATE janastudio.services SET
  name = replace(replace(
    name,
    'Acr??lico', 'Acr' || CHR(237) || 'lico'),
    'Acr??licos', 'Acr' || CHR(237) || 'licos'),
  description = replace(replace(replace(
    description,
    'Acr??lico', 'Acr' || CHR(237) || 'lico'),
    'Construcci??n', 'Construcci' || CHR(243) || 'n'),
    'Reparaci??n', 'Reparaci' || CHR(243) || 'n');
