// FILE: /app/u/[slug]/BottomGlassBar.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import type { Unit } from "./menuTypes";

function normalizeInstagram(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const handle = v.replace(/^@/, "").replace(/\s+/g, "");
  return `https://instagram.com/${handle}`;
}

function normalizeWhatsappToWaMe(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  // se já vier com DDI ok, senão assume Brasil
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function mapsFromAddress(address: string) {
  const v = address.trim();
  if (!v) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`;
}

export default function BottomGlassBar({ unit }: { unit: Unit }) {
  const links: { key: string; label: string; href: string; icon: string }[] = [];

  const ig = normalizeInstagram(unit.instagram || "");
  const wa = normalizeWhatsappToWaMe(unit.whatsapp || "");

  // prioridade: maps_url (se você tiver), senão gera do address
  const maps =
    (unit.maps_url || "").trim() ||
    mapsFromAddress(unit.address || "");

  if (ig) links.push({ key: "instagram", label: "Instagram", href: ig, icon: "📷" });
  if (maps) links.push({ key: "maps", label: "Maps", href: maps, icon: "🗺️" });
  if (wa) links.push({ key: "whatsapp", label: "WhatsApp", href: wa, icon: "💬" });

  if (links.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-[520px] px-4 pb-4">
        <div className="rounded-2xl border border-white/15 bg-black/70 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            <div className="min-w-0">
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
                  className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 text-sm"
                >
                  <span className="mr-2">{l.icon}</span>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}