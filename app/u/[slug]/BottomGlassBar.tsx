// FILE: /app/u/[slug]/BottomGlassBar.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import { useMemo } from "react";
import type { Unit } from "./menuTypes";

type Props = {
  unit: Unit;
};

function normalizeInstagram(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  // se vier só @user
  const handle = s.startsWith("@") ? s.slice(1) : s;

  // se já é url
  if (/^https?:\/\//i.test(handle)) return handle;

  // se veio instagram.com/...
  if (/instagram\.com/i.test(handle)) return `https://${handle.replace(/^\/\//, "")}`;

  return `https://instagram.com/${handle}`;
}

function normalizeWhatsappToWaMe(raw: string): string | null {
  const s = (raw ?? "").toString().trim();
  if (!s) return null;

  // pega só dígitos
  const digits = s.replace(/\D/g, "");
  if (!digits) return null;

  // se já vier com 55, beleza; senão, assume BR (55)
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function mapsFromQuery(query: string): string | null {
  const q = (query ?? "").trim();
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default function BottomGlassBar({ unit }: Props) {
  const links = useMemo(() => {
    const items: Array<{ key: string; label: string; href: string; icon: string }> = [];

    const ig = normalizeInstagram(unit.instagram || "");
    if (ig) items.push({ key: "instagram", label: "Instagram", href: ig, icon: "📷" });

    // ✅ prioridade: maps_url vindo do banco
    const maps =
      (unit.maps_url && unit.maps_url.trim()) ||
      mapsFromQuery(
        [unit.name, unit.neighborhood, unit.city].filter(Boolean).join(" - ")
      );

    if (maps) items.push({ key: "maps", label: "Como chegar", href: maps, icon: "📍" });

    const wa = normalizeWhatsappToWaMe(unit.whatsapp || "");
    if (wa) items.push({ key: "whatsapp", label: "WhatsApp", href: wa, icon: "💬" });

    return items;
  }, [unit]);

  if (links.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-2xl px-4 pb-4">
        <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{unit.name}</div>
              <div className="text-xs text-white/70 truncate">
                {(unit.city || "") + (unit.neighborhood ? ` • ${unit.neighborhood}` : "")}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {links.map((l) => (
                <a
                  key={l.key}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10 transition"
                >
                  <span aria-hidden>{l.icon}</span>
                  <span className="hidden sm:inline">{l.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}