import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Metode tidak didukung.' }, 405)
  }

  try {
    const { username: rawUsername, password } = await request.json()
    const username = String(rawUsername || '').trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9._-]{1,39}$/.test(username) || typeof password !== 'string' || !password) {
      return json({ error: 'Nama pengguna atau kata sandi salah.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('Konfigurasi Supabase Edge Function belum lengkap.')
      return json({ error: 'Login belum dikonfigurasi.' }, 500)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('email, active')
      .eq('username', username)
      .maybeSingle()

    if (profileError || !profile?.active || !profile.email) {
      return json({ error: 'Nama pengguna atau kata sandi salah.' }, 401)
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await authClient.auth.signInWithPassword({ email: profile.email, password })
    if (error || !data.session) {
      return json({ error: 'Nama pengguna atau kata sandi salah.' }, 401)
    }

    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  } catch (error) {
    console.error('Username login failed:', error)
    return json({ error: 'Permintaan login tidak valid.' }, 400)
  }
})

function json(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
