import { createClient } from 'npm:@supabase/supabase-js@2.104.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authorization = request.headers.get('Authorization') || ''
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const { data: caller } = await admin.from('staff').select('id, role, active')
      .eq('auth_user_id', user.id).maybeSingle()
    const callerRole = String(caller?.role || '').split('|')[0].trim().toLowerCase()
    if (!caller || caller.active === false || callerRole !== 'admin') {
      return json({ error: 'Admin access required' }, 403)
    }

    const body = await request.json()
    const action = String(body.action || '')
    const publicSelect = 'id, auth_user_id, email, name, role, commission_pct, active, created_at, image_url, phone, address, tools, washing_rate, birth_date'

    if (action === 'create') {
      const member = { ...(body.member || {}) }
      const email = String(body.email || member.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      if (!email || password.length < 8) return json({ error: 'Email and password (8+ characters) are required' }, 400)
      const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (authError) return json({ error: authError.message }, 400)
      delete member.password
      delete member.username
      const { data, error } = await admin.from('staff').insert({ ...member, email, auth_user_id: authData.user.id })
        .select(publicSelect).single()
      if (error) {
        await admin.auth.admin.deleteUser(authData.user.id)
        return json({ error: error.message }, 400)
      }
      return json({ data })
    }

    if (action === 'update') {
      const updates = { ...(body.updates || {}) }
      delete updates.password
      delete updates.username
      delete updates.auth_user_id
      const { data, error } = await admin.from('staff').update(updates).eq('id', String(body.staffId || ''))
        .select(publicSelect).single()
      return error ? json({ error: error.message }, 400) : json({ data })
    }

    if (action === 'credentials') {
      const authUserId = String(body.authUserId || '')
      const updates: Record<string, unknown> = {}
      if (body.email) { updates.email = String(body.email).trim().toLowerCase(); updates.email_confirm = true }
      if (body.password) updates.password = String(body.password)
      if (!authUserId || Object.keys(updates).length === 0) return json({ data: null })
      const { error } = await admin.auth.admin.updateUserById(authUserId, updates)
      if (error) return json({ error: error.message }, 400)
      if (updates.email) await admin.from('staff').update({ email: updates.email }).eq('auth_user_id', authUserId)
      return json({ data: true })
    }

    if (action === 'link') {
      const staffId = String(body.staffId || '')
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      if (!staffId || !email || password.length < 8) return json({ error: 'Invalid link request' }, 400)
      const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (authError) return json({ error: authError.message }, 400)
      const { data, error } = await admin.from('staff').update({ auth_user_id: authData.user.id, email })
        .eq('id', staffId).select(publicSelect).single()
      if (error) {
        await admin.auth.admin.deleteUser(authData.user.id)
        return json({ error: error.message }, 400)
      }
      return json({ data })
    }

    if (action === 'archive') {
      const staffId = String(body.staffId || '')
      const { data: member } = await admin.from('staff').select('role, auth_user_id').eq('id', staffId).single()
      if (!member) return json({ error: 'Staff member not found' }, 404)
      const role = String(member.role || '')
      const archivedRole = role.startsWith('ARCHIVED|') ? role : `ARCHIVED|${role}`
      const { error } = await admin.from('staff').update({ role: archivedRole, active: false }).eq('id', staffId)
      if (error) return json({ error: error.message }, 400)
      if (member.auth_user_id) await admin.auth.admin.updateUserById(member.auth_user_id, { ban_duration: '876000h' })
      return json({ data: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    console.error(error)
    return json({ error: 'Internal server error' }, 500)
  }
})
