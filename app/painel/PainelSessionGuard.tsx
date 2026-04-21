"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Enforces session-only behavior when user did NOT check "Mantenha-me conectado".
// fy_remember (localStorage)  → persistent 30-day session, no action needed.
// fy_session_only (sessionStorage) → tab-only session, cleared when browser closes.
// Neither flag found → browser was closed without remember-me → sign out.
export default function PainelSessionGuard() {
  const router = useRouter();

  useEffect(() => {
    const remember = localStorage.getItem("fy_remember");
    const sessionOnly = sessionStorage.getItem("fy_session_only");

    if (!remember && !sessionOnly) {
      const supabase = createClient();
      supabase.auth.signOut().then(() => {
        router.replace("/entrar");
      });
    }
  }, [router]);

  return null;
}
