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
    const authorization = request.headers.get('Authorization') || ''
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const { data: { user }, error: userError } = await client.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })
    const { data: staff } = await admin.from('staff').select('role, active')
      .eq('auth_user_id', user.id).maybeSingle()
    if (!staff || staff.active === false || String(staff.role || '').startsWith('ARCHIVED|')) {
      return json({ error: 'Active staff access required' }, 403)
    }

    const { payload } = await request.json()
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json({ error: 'Invalid payload' }, 400)
    }
    if (payload.action === 'cierreSemanal') {
      const role = String(staff.role || '').split('|')[0].trim().toLowerCase()
      if (role !== 'admin') return json({ error: 'Admin access required' }, 403)
    }

    const webhookUrl = Deno.env.get('GOOGLE_SHEETS_WEBHOOK_URL')
    if (!webhookUrl) return json({ error: 'Sheets webhook is not configured' }, 503)
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    })
    if (!upstream.ok) return json({ error: `Sheets returned HTTP ${upstream.status}` }, 502)
    return json({ data: true })
  } catch (error) {
    console.error(error)
    return json({ error: 'Internal server error' }, 500)
  }
})