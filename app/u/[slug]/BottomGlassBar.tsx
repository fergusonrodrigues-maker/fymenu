"use client";

import React, { useMemo } from "react";

type UnitLike = {
  name?: string;
  logo_url?: string;
  address?: string;
  instagram?: string;
  whatsapp?: string;

  // Se existirem no schema futuramente, já suporta:
  city?: string;
  neighborhood?: string;
};

type FooterLink = {
  key: "instagram" | "maps" | "whatsapp";
  label: string;
  href: string;
  icon: string; // emoji pra não inventar SVG fixo
};

function normalizeInstagram(instagram: string) {
  const v = (instagram ?? "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const handle = v.replace("@", "").trim();
  if (!handle) return "";
  return `https://instagram.com/${handle}`;
}

function mapsFromAddress(address: string) {
  const v = (address ?? "").trim();
  if (!v) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`;
}

function normalizeWhatsappToWaMe(phone: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

// Heurística leve (não muda schema): tenta inferir cidade/bairro do address por vírgula
function inferCityNeighborhoodFromAddress(address?: string) {
  const raw = (address ?? "").trim();
  if (!raw) return { city: "", neighborhood: "" };

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const city = parts[parts.length - 1] || "";
    const neighborhood = parts[parts.length - 2] || "";
    return { city, neighborhood };
  }

  return { city: parts[0] || "", neighborhood: "" };
}

function buildLinks(unit: UnitLike): FooterLink[] {
  const links: FooterLink[] = [];
  const ig = normalizeInstagram(unit.instagram || "");
  const maps = mapsFromAddress(unit.address || "");
  const wa = normalizeWhatsappToWaMe(unit.whatsapp || "");

  if (ig) links.push({ key: "instagram", label: "Instagram", href: ig, icon: "📷" });
  if (maps) links.push({ key: "maps", label: "Maps", href: maps, icon: "📍" });
  if (wa) links.push({ key: "whatsapp", label: "WhatsApp", href: wa, icon: "💬" });

  return links;
}

export default function BottomGlassBar({ unit }: { unit: UnitLike }) {
  const links = useMemo(() => buildLinks(unit), [unit]);

  // Texto: "Cidade - Unidade: Bairro"
  const placeText = useMemo(() => {
    const city = (unit.city ?? "").trim();
    const neighborhood = (unit.neighborhood ?? "").trim();

    const inferred = inferCityNeighborhoodFromAddress(unit.address);
    const finalCity = city || inferred.city || "Cidade";
    const finalNeighborhood = neighborhood || inferred.neighborhood || unit.name || "Unidade";

    return `${finalCity} - Unidade: ${finalNeighborhood}`;
  }, [unit.address, unit.city, unit.neighborhood, unit.name]);

  // Se não tiver nada (sem logo e sem links), não renderiza barra.
  const hasLogo = !!(unit.logo_url ?? "").trim();
  const hasAnything = hasLogo || links.length > 0;

  if (!hasAnything) return null;

  // Liquid glass dark (premium)
  const glassOuter = {
    background: "rgba(0,0,0,0.40)", // bg-black/40
    border: "1px solid rgba(255,255,255,0.10)", // border-white/10
    boxShadow: "0 24px 70px rgba(0,0,0,0.55)", // shadow-2xl vibe
    backdropFilter: "blur(22px) saturate(150%)", // blur forte + saturate
    WebkitBackdropFilter: "blur(22px) saturate(150%)",
  } as const;

  const glassBadge = {
    background: "rgba(0,0,0,0.30)", // bg-black/30
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
    backdropFilter: "blur(16px) saturate(140%)",
    WebkitBackdropFilter: "blur(16px) saturate(140%)",
  } as const;

  const miniGlassBtn = (isWhatsApp: boolean) =>
    ({
      background: isWhatsApp ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.10)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 18,
      padding: 12,
      display: "grid",
      placeItems: "center",
      textDecoration: "none",
      color: "#fff",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      transition: "transform 140ms ease, background 140ms ease",
      willChange: "transform",
    }) as const;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 16,
        zIndex: 60,
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
      }}
    >
      {/* Barra superior (badge) */}
      <div
        style={{
          pointerEvents: "auto",
          ...glassBadge,
          borderRadius: 999,
          padding: "8px 16px",
          color: "rgba(255,255,255,0.90)",
          fontSize: 13,
          fontWeight: 800,
          textAlign: "center",
          maxWidth: "92%",
        }}
      >
        {placeText}
      </div>

      {/* Espaçamento pequeno */}
      <div style={{ height: 10 }} />

      {/* Barra principal */}
      <div
        style={{
          pointerEvents: "auto",
          width: "92%",
          maxWidth: 420, // max-w-md
          borderRadius: 26, // rounded-3xl
          padding: 14,
          ...glassOuter,
          // leve brilho interno (bem sutil)
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.10), 0 24px 70px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: hasLogo ? "1fr auto auto auto" : "auto auto auto",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* LOGO */}
          {hasLogo && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                minWidth: 0,
                paddingLeft: 6,
              }}
            >
              <img
                src={unit.logo_url}
                alt="Logo"
                style={{
                  maxHeight: 48, // max-h-12
                  width: "auto",
                  maxWidth: 130,
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          )}

          {/* BOTÕES */}
          {links.map((l) => {
            const isWA = l.key === "whatsapp";
            return (
              <a
                key={l.key}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                aria-label={l.label}
                title={l.label}
                style={miniGlassBtn(isWA)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.05)";
                  (e.currentTarget as HTMLAnchorElement).style.background = isWA
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(255,255,255,0.16)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
                  (e.currentTarget as HTMLAnchorElement).style.background = isWA
                    ? "rgba(255,255,255,0.14)"
                    : "rgba(255,255,255,0.10)";
                }}
              >
                <span style={{ fontSize: 18 }}>{l.icon}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}