import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Load service role key with multiple fallbacks to avoid RLS-related "not found" issues when env is not injected.
const loadServiceRoleKey = (): string | undefined => {
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (envKey) return envKey

  const candidatePaths = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), 'huanxin-app', '.env.local'),
    path.join(__dirname, '..', '..', '.env.local'),
    path.join(__dirname, '..', '..', '..', '.env.local'),
  ]

  for (const p of candidatePaths) {
    try {
      if (!fs.existsSync(p)) continue
      const content = fs.readFileSync(p, 'utf8')
      for (const line of content.split(/\r?\n/)) {
        const m = line.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/)
        if (m && m[1]) {
          const key = m[1].trim()
          if (key) {
            process.env.SUPABASE_SERVICE_ROLE_KEY = key
            return key
          }
        }
      }
    } catch {
      // ignore and try next path
    }
  }
  return undefined
}

// Lazily resolve service role key so that even if env is missing at process start,
// we can still load it from .env.local on-demand.
const getServiceKey = () => {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim()) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
  }
  const fromFile = loadServiceRoleKey()
  if (fromFile) return fromFile
  return undefined
}

// SSR/client-supabase that reads auth cookies from Next context (for /api/auth/me, etc.)
export const createClient = () => {
  const cookieStore = cookies()

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )
}

// Service client for API routes: prefers service role to bypass RLS.
export const createServiceClient = (options?: { jwt?: string; forceServiceRole?: boolean }) => {
  const serviceKey = getServiceKey()
  const useService = serviceKey && (options?.forceServiceRole ?? true)
  const key = useService ? serviceKey! : options?.jwt || SUPABASE_ANON_KEY
  const headers: Record<string, string> = {
    'X-Client-Info': 'huanxin-service/1.0',
  }
  // Always prefer service role to bypass RLS for server-side actions.
  if (useService) {
    headers.Authorization = `Bearer ${serviceKey}`
  } else if (options?.jwt) {
    headers.Authorization = `Bearer ${options.jwt}`
  }

  return createSupabaseClient(SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers,
    },
  })
}
