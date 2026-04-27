"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { validateSession } from "@/app/colaborador-app/actions";

// Wraps every route under /colaborador-app/[slug]/*. Enforces session on the
// nested routes (home, tarefas, ponto, …) and lets the slug-root login page
// render unprotected.
export default function SlugLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const pathname = usePathname() ?? "";

  // Login lives at the slug root: /colaborador-app/{slug} (with or without trailing slash).
  // Anything deeper is protected.
  const isLoginRoute =
    pathname === `/colaborador-app/${params.slug}` ||
    pathname === `/colaborador-app/${params.slug}/`;

  const [ready, setReady] = useState<boolean>(isLoginRoute);

  useEffect(() => {
    if (isLoginRoute) {
      setReady(true);
      return;
    }

    let cancelled = false;
    async function check() {
      let token: string | null = null;
      try { token = sessionStorage.getItem("fy_emp_token"); } catch { /* */ }

      if (!token) {
        router.replace("/colaborador");
        return;
      }

      const result = await validateSession(token);
      if (cancelled) return;

      if (!result.valid) {
        try {
          sessionStorage.removeItem("fy_emp_token");
          sessionStorage.removeItem("fy_emp_id");
          sessionStorage.removeItem("fy_emp_unit");
          sessionStorage.removeItem("fy_emp_roles");
          sessionStorage.removeItem("fy_emp_name");
        } catch { /* */ }
        router.replace("/colaborador");
        return;
      }

      setReady(true);
    }
    check();
    return () => { cancelled = true; };
  }, [isLoginRoute, router]);

  if (!ready) {
    return (
      <div style={{
        minHeight: "100vh", background: "#fafafa",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{
            width: 32, height: 32, border: "3px solid #e5e7eb",
            borderTopColor: "#16a34a", borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            margin: "0 auto 12px",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 13 }}>Verificando sessão…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
