// FILE: /app/u/[slug]/BottomGlassBar.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import type { Unit } from "./menuTypes";

type LinkItem = {
  key: string;
  label: string;
  href: string;
  icon: string;
};

function normalizeInstagram(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  // já é url
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // @user ou user
  const user = s.replace(/^@/, "").replace(/\s+/g, "");
  if (!user) return null;

  return `https://instagram.com/${user}`;
}

function normalizeWhatsappToWaMe(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  // pega só números
  let digits = s.replace(/\D/g, "");

  // se veio sem DDI, assume BR
  if (digits.length === 11 || digits.length === 10) digits = `55${digits}`;

  if (digits.length < 12) return null;
  return `https://wa.me/${digits}`;
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function mapsFromUnit(unit: Unit): string | null {
  // ✅ prioridade: maps_url do banco
  const direct = (unit.maps_url ?? "").trim();
  if (direct && isHttpUrl(direct)) return direct;

  // fallback: monta query por cidade+bairro (funciona bem pro MVP)
  const city = (unit.city ?? "").trim();
  const neighborhood = (unit.neighborhood ?? "").trim();

  const q = [neighborhood, city].filter(Boolean).join(", ");
  if (!q) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default function BottomGlassBar({ unit }: { unit: Unit }) {
  const links: LinkItem[] = [];

  const ig = normalizeInstagram(unit.instagram || "");
  const maps = mapsFromUnit(unit);
  const wa = normalizeWhatsappToWaMe(unit.whatsapp || "");

  if (ig) links.push({ key: "instagram", label: "Instagram", href: ig, icon: "📷" });
  if (maps) links.push({ key: "maps", label: "Maps", href: maps, icon: "📍" });
  if (wa) links.push({ key: "whatsapp", label: "WhatsApp", href: wa, icon: "💬" });

  if (links.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* barra maior */}
      <div className="mx-auto max-w-[520px] px-4 pb-4">
        <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-around gap-2 px-3 py-3">
            {links.map((l) => (
              <a
                key={l.key}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl hover:bg-white/10 transition"
              >
                <div className="text-lg leading-none">{l.icon}</div>
                <div className="text-[11px] text-white/80">{l.label}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}