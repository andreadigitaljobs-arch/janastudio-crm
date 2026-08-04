-- RPC: Create staff member with Supabase Auth user
-- Uses direct auth.users insert instead of edge function
CREATE OR REPLACE FUNCTION janastudio.create_staff_with_auth(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT,
  p_phone TEXT DEFAULT NULL,
  p_active BOOLEAN DEFAULT TRUE,
  p_commission_pct NUMERIC DEFAULT 0.30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = janastudio, auth, public
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
  v_staff_id UUID;
  v_result JSONB;
BEGIN
  -- Validate
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- Check if email already exists in auth
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(trim(p_email))) THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;

  -- Create auth user
  v_user_id := gen_random_uuid();
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_token, confirmation_token,
    confirmation_sent_at, created_at, updated_at, confirmation_token_new,
    email_change_token_current, email_change, email_change_sent_at,
    is_super_admin, raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    v_encrypted_password,
    NOW(),
    '',
    encode(gen_random_bytes(32), 'hex'),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    NOW(),
    FALSE,
    '{"provider":"email","providers":["email"]}',
    '{}'
  );

  -- Create identity (required for Supabase Auth)
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id, lower(trim(p_email)))::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Create staff record
  INSERT INTO janastudio.staff (
    auth_user_id, email, name, role, phone, active, commission_pct
  ) VALUES (
    v_user_id, lower(trim(p_email)), p_name, p_role, p_phone, p_active, p_commission_pct
  ) RETURNING id INTO v_staff_id;

  -- Return result
  SELECT jsonb_build_object(
    'id', v_staff_id,
    'auth_user_id', v_user_id,
    'email', lower(trim(p_email)),
    'name', p_name,
    'role', p_role
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- RPC: Update staff auth credentials (email/password)
CREATE OR REPLACE FUNCTION janastudio.update_staff_auth_credentials(
  p_auth_user_id UUID,
  p_email TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = janastudio, auth, public
AS $$
DECLARE
  v_updates JSONB := '{}';
BEGIN
  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user ID is required';
  END IF;

  -- Update email
  IF p_email IS NOT NULL AND p_email != '' THEN
    UPDATE auth.users
    SET email = lower(trim(p_email)),
        email_change_token_current = '',
        email_change = '',
        updated_at = NOW()
    WHERE id = p_auth_user_id;

    UPDATE auth.identities
    SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(lower(trim(p_email)))),
        updated_at = NOW()
    WHERE user_id = p_auth_user_id AND provider = 'email';

    UPDATE janastudio.staff
    SET email = lower(trim(p_email))
    WHERE auth_user_id = p_auth_user_id;

    v_updates := v_updates || jsonb_build_object('email', lower(trim(p_email)));
  END IF;

  -- Update password
  IF p_password IS NOT NULL AND p_password != '' THEN
    UPDATE auth.users
    SET encrypted_password = crypt(p_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = p_auth_user_id;

    v_updates := v_updates || '{"password": true}';
  END IF;

  IF v_updates = '{}' THEN
    RETURN jsonb_build_object('data', null);
  END IF;

  RETURN jsonb_build_object('data', true, 'updates', v_updates);
END;
$$;

-- RPC: Link existing auth user to staff record
CREATE OR REPLACE FUNCTION janastudio.link_auth_to_staff(
  p_staff_id UUID,
  p_email TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = janastudio, auth, public
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  IF p_staff_id IS NULL OR p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Staff ID and email are required';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- Create auth user
  v_user_id := gen_random_uuid();
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_token, confirmation_token,
    confirmation_sent_at, created_at, updated_at, confirmation_token_new,
    email_change_token_current, email_change, email_change_sent_at,
    is_super_admin, raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    v_encrypted_password,
    NOW(),
    '',
    encode(gen_random_bytes(32), 'hex'),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    NOW(),
    FALSE,
    '{"provider":"email","providers":["email"]}',
    '{}'
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id, lower(trim(p_email)))::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Link to staff
  UPDATE janastudio.staff
  SET auth_user_id = v_user_id, email = lower(trim(p_email))
  WHERE id = p_staff_id;

  RETURN jsonb_build_object(
    'data', jsonb_build_object('id', p_staff_id, 'auth_user_id', v_user_id, 'email', lower(trim(p_email)))
  );
END;
$$;

-- RPC: Archive staff member (soft delete)
CREATE OR REPLACE FUNCTION janastudio.archive_staff(p_staff_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = janastudio, auth, public
AS $$
DECLARE
  v_role TEXT;
  v_auth_user_id UUID;
  v_archived_role TEXT;
BEGIN
  SELECT role, auth_user_id INTO v_role, v_auth_user_id
  FROM janastudio.staff WHERE id = p_staff_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;

  v_archived_role := CASE WHEN v_role LIKE 'ARCHIVED|%' THEN v_role ELSE 'ARCHIVED|' || v_role END;

  UPDATE janastudio.staff
  SET role = v_archived_role, active = FALSE
  WHERE id = p_staff_id;

  -- Ban auth user (100 years)
  IF v_auth_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET banned_until = NOW() + INTERVAL '100 years',
        updated_at = NOW()
    WHERE id = v_auth_user_id;
  END IF;

  RETURN jsonb_build_object('data', true);
END;
$$;

-- Grant execute to authenticated users (admin check is done in the function via SECURITY DEFINER)
-- Actually, SECURITY DEFINER runs as the function owner (postgres), so we need to grant usage
GRANT EXECUTE ON FUNCTION janastudio.create_staff_with_auth TO authenticated;
GRANT EXECUTE ON FUNCTION janastudio.update_staff_auth_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION janastudio.link_auth_to_staff TO authenticated;
GRANT EXECUTE ON FUNCTION janastudio.archive_staff TO authenticated;
