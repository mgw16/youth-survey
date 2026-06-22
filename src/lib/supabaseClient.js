import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// When the two env vars are present we run "for real" against Supabase.
// When they're missing we fall back to demo mode (see store.js).
export const isLive = Boolean(url && anonKey)

export const supabase = isLive ? createClient(url, anonKey) : null
