-- capillary_diagnoses was created without the standard PostgREST role grants
-- that every other janastudio table has (see janastudio.clients), so the
-- frontend's anon/authenticated requests silently failed with "permission
-- denied for table capillary_diagnoses" (error 42501). Mirrors the exact
-- grant set already in place on janastudio.clients.

grant select, insert, update, delete, truncate, references, trigger
  on janastudio.capillary_diagnoses to anon, authenticated, authenticator;

notify pgrst, 'reload schema';
