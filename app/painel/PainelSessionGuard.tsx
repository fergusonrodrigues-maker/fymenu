"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Enforces session-only behavior when user did NOT check "Mantenha-me conectado".
// fy_remember='true'  (localStorage) → persistent 30-day cookie, no action needed.
// fy_remember='false' (localStorage) → session cookie; browser handles expiry on close.
// fy_remember=null → flag missing (unknown state) → sign out.
// fy_session_only (sessionStorage) → backward compat for sessions created before this change.
export default function PainelSessionGuard() {
  const router = useRouter();

  useEffect(() => {
    const remember = localStorage.getItem("fy_remember");
    const sessionOnly = sessionStorage.getItem("fy_session_only");

    if (remember === null && !sessionOnly) {
      const supabase = createClient();
      supabase.auth.signOut().then(() => {
        router.replace("/entrar");
      });
    }
  }, [router]);

  return null;
}
