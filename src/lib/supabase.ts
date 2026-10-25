import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const GIFT_ACCOUNT_EMAIL = (import.meta.env.VITE_GIFT_EMAIL ?? '').trim()

/** True when either Supabase value is present, so partial setup is not hidden. */
export const hasSupabaseEnvironment = Boolean(supabaseUrl || supabaseAnonKey)

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'birthday-gift-private-session',
      },
    })
  }
  return client
}

/**
 * Returns a user-facing setup problem, or null when Supabase is complete.
 * The anon key is safe in the browser; a service-role key never is.
 */
export function supabaseConfigProblem(): string | null {
  if (!hasSupabaseEnvironment) return null
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'Supabase is only half-configured. Add both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  }
  if (!GIFT_ACCOUNT_EMAIL) {
    return 'Add VITE_GIFT_EMAIL — the email of the private Supabase account used by this gift.'
  }
  return null
}
