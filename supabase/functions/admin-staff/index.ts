const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

async function verifyJwt(token: string, secret: string): Promise<{ sub?: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const hexToBytes = (hex: string) => Uint8Array.from(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    )
    if (!valid) return null
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const jwtSecret = Deno.env.get('JWT_SECRET')!
    const headers = { 'Content-Type': 'application/json', 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }

    const authorization = request.headers.get('Authorization') || ''
    const token = authorization.replace('Bearer ', '')
    if (!token) return json({ error: 'No token provided' }, 401)

    const payload = await verifyJwt(token, jwtSecret)
    if (!payload?.sub) return json({ error: 'Invalid token' }, 401)

    const callerRes = await fetch(`${supabaseUrl}/rest/v1/staff?auth_user_id=eq.${payload.sub}&select=id,role,active`, { headers })
    const callers = await callerRes.json()
    const caller = callers?.[0]
    if (!caller || caller.active === false || String(caller.role || '').split('|')[0].trim().toLowerCase() !== 'admin') {
      return json({ error: 'Admin access required' }, 403)
    }

    const body = await request.json()
    const action = String(body.action || '')

    if (action === 'create') {
      const member = { ...(body.member || {}) }
      const email = String(body.email || member.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      if (!email || password.length < 6) return json({ error: 'Email and password (6+ characters) are required' }, 400)
      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
        body: JSON.stringify({ email, password, email_confirm: true }),
      })
      const authData = await authRes.json()
      if (authData.code) return json({ error: authData.msg || authData.message || 'Auth error' }, 400)
      delete member.password
      delete member.username
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/staff`, {
        method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ ...member, email, auth_user_id: authData.id }),
      })
      const insertData = await insertRes.json()
      if (insertRes.status >= 400) {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${authData.id}`, { method: 'DELETE', headers })
        return json({ error: insertData.message || 'Insert failed' }, 400)
      }
      return json({ data: Array.isArray(insertData) ? insertData[0] : insertData })
    }

    if (action === 'update') {
      const updates = { ...(body.updates || {}) }
      delete updates.password
      delete updates.username
      delete updates.auth_user_id
      const staffId = String(body.staffId || '')
      const updateRes = await fetch(`${supabaseUrl}/rest/v1/staff?id=eq.${staffId}`, {
        method: 'PATCH', headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(updates),
      })
      const updateData = await updateRes.json()
      if (updateRes.status >= 400) return json({ error: updateData.message || 'Update failed' }, 400)
      return json({ data: Array.isArray(updateData) ? updateData[0] : updateData })
    }

    if (action === 'credentials') {
      const authUserId = String(body.authUserId || '')
      const updates: Record<string, unknown> = {}
      if (body.email) { updates.email = String(body.email).trim().toLowerCase(); updates.email_confirm = true }
      if (body.password) updates.password = String(body.password)
      if (!authUserId || Object.keys(updates).length === 0) return json({ data: null })
      const credRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
        body: JSON.stringify(updates),
      })
      const credData = await credRes.json()
      if (credData.code) return json({ error: credData.msg || 'Auth update failed' }, 400)
      if (updates.email) {
        await fetch(`${supabaseUrl}/rest/v1/staff?auth_user_id=eq.${authUserId}`, {
          method: 'PATCH', headers, body: JSON.stringify({ email: updates.email }),
        })
      }
      return json({ data: true })
    }

    if (action === 'link') {
      const staffId = String(body.staffId || '')
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      if (!staffId || !email || password.length < 6) return json({ error: 'Invalid link request' }, 400)
      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
        body: JSON.stringify({ email, password, email_confirm: true }),
      })
      const authData = await authRes.json()
      if (authData.code) return json({ error: authData.msg || 'Auth error' }, 400)
      const linkRes = await fetch(`${supabaseUrl}/rest/v1/staff?id=eq.${staffId}`, {
        method: 'PATCH', headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ auth_user_id: authData.id, email }),
      })
      const linkData = await linkRes.json()
      if (linkRes.status >= 400) {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${authData.id}`, { method: 'DELETE', headers })
        return json({ error: linkData.message || 'Link failed' }, 400)
      }
      return json({ data: Array.isArray(linkData) ? linkData[0] : linkData })
    }

    if (action === 'archive') {
      const staffId = String(body.staffId || '')
      const memberRes = await fetch(`${supabaseUrl}/rest/v1/staff?id=eq.${staffId}&select=role,auth_user_id`, { headers })
      const members = await memberRes.json()
      const member = members?.[0]
      if (!member) return json({ error: 'Staff member not found' }, 404)
      const role = String(member.role || '')
      const archivedRole = role.startsWith('ARCHIVED|') ? role : `ARCHIVED|${role}`
      await fetch(`${supabaseUrl}/rest/v1/staff?id=eq.${staffId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ role: archivedRole, active: false }),
      })
      if (member.auth_user_id) {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${member.auth_user_id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
          body: JSON.stringify({ ban_duration: '876000h' }),
        })
      }
      return json({ data: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    console.error('admin-staff error:', error)
    return json({ error: 'Internal server error' }, 500)
  }
})
