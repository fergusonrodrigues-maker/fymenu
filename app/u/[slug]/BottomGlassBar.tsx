"use client";

import { useMemo } from "react";
import type { Unit } from "./menuTypes";

type Props = { unit: Unit };

function normalizeWhatsapp(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function normalizeInstagram(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const handle = s.startsWith("@") ? s.slice(1) : s;
  if (/^https?:\/\//i.test(handle)) return handle;
  if (/instagram\.com/i.test(handle)) return `https://${handle.replace(/^\/\//, "")}`;
  return `https://instagram.com/${handle}`;
}

function mapsUrl(unit: Unit): string | null {
  if (unit.maps_url?.trim()) return unit.maps_url.trim();
  const q = [unit.name, unit.neighborhood, unit.city].filter(Boolean).join(" - ");
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default function BottomGlassBar({ unit }: Props) {
  const wa = useMemo(() => normalizeWhatsapp(unit.whatsapp || ""), [unit.whatsapp]);
  const ig = useMemo(() => normalizeInstagram(unit.instagram || ""), [unit.instagram]);
  const maps = useMemo(() => mapsUrl(unit), [unit]);

  const cityLabel = [unit.city].filter(Boolean).join(" - ");
  const neighborhoodLabel = unit.neighborhood || "";

  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center items-center z-50 px-4 pointer-events-none">

      {/* Barra principal (Liquid Glass) */}
      <div className="flex items-center h-[80px] bg-black/70 backdrop-blur-xl rounded-[24px] px-3 gap-3 pointer-events-auto border border-white/10 shadow-2xl">

        {/* Ícone 1: Mapa/Local */}
        {maps ? (
          <a
            href={maps}
            target="_blank"
            rel="noreferrer"
            className="flex justify-center items-center w-[64px] h-[64px] bg-[#e63232] rounded-[18px] active:scale-95 transition-transform overflow-hidden"
          >
            {/* Substitua o src pelo ícone do seu bucket */}
            <span style={{ fontSize: 28 }}>📍</span>
          </a>
        ) : (
          <div className="flex justify-center items-center w-[64px] h-[64px] bg-[#e63232] rounded-[18px] overflow-hidden">
            <span style={{ fontSize: 28 }}>📍</span>
          </div>
        )}

        {/* Texto: Cidade/Bairro */}
        <div className="flex flex-col justify-center items-start w-[140px] h-[64px] bg-white text-black px-3 rounded-[18px]">
          <strong className="text-[14px] font-black leading-tight tracking-tight">
            {cityLabel || unit.name}
          </strong>
          {neighborhoodLabel && (
            <span className="text-[11px] font-medium tracking-tight leading-tight mt-[2px]">
              unidade:<br />{neighborhoodLabel}
            </span>
          )}
        </div>

        {/* Ícone Central (Logo da Unidade flutuando) */}
        <div className="relative flex justify-center items-center w-[104px] h-[104px] bg-white rounded-[30px] shadow-xl -mt-8 flex-shrink-0">
          <div className="flex justify-center items-center w-[92px] h-[92px] bg-[#1a9cff] rounded-[24px] overflow-hidden">
            {unit.logo_url ? (
              <img
                src={unit.logo_url}
                alt={unit.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span style={{ fontSize: 36 }}>🍽️</span>
            )}
          </div>
        </div>

        {/* Ícone 2: WhatsApp */}
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex justify-center items-center w-[64px] h-[64px] bg-[#1db954] rounded-[18px] active:scale-95 transition-transform overflow-hidden"
          >
            {/* Substitua o src pelo ícone do seu bucket */}
            <span style={{ fontSize: 28 }}>💬</span>
          </a>
        ) : (
          <div className="flex justify-center items-center w-[64px] h-[64px] bg-[#1db954] rounded-[18px] overflow-hidden opacity-30">
            <span style={{ fontSize: 28 }}>💬</span>
          </div>
        )}

        {/* Ícone 3: Instagram */}
        {ig ? (
          <a
            href={ig}
            target="_blank"
            rel="noreferrer"
            className="flex justify-center items-center w-[64px] h-[64px] rounded-[18px] active:scale-95 transition-transform bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#285AEB] overflow-hidden"
          >
            {/* Substitua o src pelo ícone do seu bucket */}
            <span style={{ fontSize: 28 }}>📷</span>
          </a>
        ) : (
          <div className="flex justify-center items-center w-[64px] h-[64px] rounded-[18px] bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#285AEB] overflow-hidden opacity-30">
            <span style={{ fontSize: 28 }}>📷</span>
          </div>
        )}

      </div>
    </div>
  );
}
