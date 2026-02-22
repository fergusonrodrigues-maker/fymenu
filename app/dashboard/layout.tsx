// FILE: /app/dashboard/layout.tsx
// ACTION: REPLACE ENTIRE FILE

import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  // MVP: pega a primeira unit (igual seu padrão atual)
  const { data: unit } = await supabase
    .from("units")
    .select("name, logo_url")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const logoUrl = unit?.logo_url ?? "";
  const unitName = unit?.name ?? "FyMenu";

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl gap-4 p-4">
        {/* Sidebar */}
        <aside className="w-16 shrink-0">
          <nav className="sticky top-4 flex flex-col gap-2 rounded-2xl bg-white/5 p-2 backdrop-blur">
            {/* Logo no topo */}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={`Logo ${unitName}`}
                  className="h-9 w-9 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="h-9 w-9 rounded-lg bg-white/10"
                  aria-label="Sem logo"
                  title="Sem logo"
                />
              )}
            </div>

            <div className="my-1 h-px w-full bg-white/10" />

            <NavIcon href="/dashboard" label="Cardápio" icon="🍽️" />
            <NavIcon href="/dashboard/unit" label="Unidade" icon="🏪" />
            <NavIcon href="/dashboard/account" label="Conta" icon="👤" />
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 rounded-2xl bg-white/5 p-4 backdrop-blur">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavIcon({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 transition hover:bg-white/10"
      aria-label={label}
      title={label}
    >
      <span className="text-lg">{icon}</span>
    </Link>
  );
}