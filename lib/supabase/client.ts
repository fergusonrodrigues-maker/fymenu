import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// rememberMe=true  → cookie maxAge 30 days, fy_remember='true' in localStorage
// rememberMe=false → session cookie (expires on browser close), fy_remember='false' in localStorage
export function getSupabaseClient(rememberMe: boolean) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    rememberMe ? { cookieOptions: { maxAge: 30 * 24 * 60 * 60 } } : undefined
  );
}