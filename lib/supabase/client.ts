import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// rememberMe=true  → stores fy_remember in localStorage (30-day session)
// rememberMe=false → stores fy_session_only in sessionStorage (tab-only session)
// Both return the same cookie-based client required for SSR middleware compatibility.
// Session-only enforcement is handled client-side via PainelSessionGuard.
export function getSupabaseClient(_rememberMe: boolean) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}