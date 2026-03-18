import { createClient } from "@supabase/supabase-js";

// Admin client bypasses RLS — requires SUPABASE_SERVICE_ROLE_KEY in .env.local
// Get it at: Supabase Dashboard → Settings → API → service_role key
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
