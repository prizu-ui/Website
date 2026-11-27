import { createClient } from '@supabase/supabase-js'

function env(name) {
  return process.env[name] || ''
}

export function getSupabaseUrl() {
  return env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
}

export function getServiceClient() {
  const url = getSupabaseUrl()
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function getAnonClient() {
  const url = getSupabaseUrl()
  const key = env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY')
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function requireAdmin(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) {
    return { errorStatus: 401, errorMessage: 'Unauthorized: missing session token' }
  }

  const anon = getAnonClient()
  const {
    data: { user },
    error: authError,
  } = await anon.auth.getUser(token)

  if (authError || !user) {
    return { errorStatus: 401, errorMessage: 'Unauthorized: invalid or expired session' }
  }

  const service = getServiceClient()
  const { data: adminRecord, error: adminErr } = await service
    .from('admin_users')
    .select('id, email, name')
    .eq('id', user.id)
    .maybeSingle()

  if (adminErr || !adminRecord) {
    return { errorStatus: 403, errorMessage: 'Forbidden: admin access required' }
  }

  return { user, admin: adminRecord, supabase: service }
}
