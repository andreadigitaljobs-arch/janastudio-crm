-- Update staff auth_user_ids with the new auth users
UPDATE public.staff SET auth_user_id = '01a3c987-c0fa-4585-895a-f39610771235' WHERE username = 'Astro.Admin';
UPDATE public.staff SET auth_user_id = '78695306-5b94-485f-9d70-fd2a607104f1' WHERE username = 'Astro.Aidan' AND name LIKE 'Aidan%';
UPDATE public.staff SET auth_user_id = 'eaceb35d-65fe-4727-99a9-536aee0de311' WHERE username = 'Astro.Alexandra';
UPDATE public.staff SET auth_user_id = '27e94929-7e88-4991-9032-d75d107c4cff' WHERE username = 'Astro.Jesus';
UPDATE public.staff SET auth_user_id = 'b359ee7e-616e-4515-957c-dc317da599ee' WHERE username = 'Astro.Manuel' AND name LIKE 'Manuel %' AND role NOT LIKE 'ARCHIVED%';

-- Verify
SELECT id, name, username, auth_user_id, email FROM public.staff ORDER BY name;
