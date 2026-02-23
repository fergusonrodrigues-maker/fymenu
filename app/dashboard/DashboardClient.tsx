"use client";

import React, { useMemo } from "react";
import Link from "next/link";

type Props = {
  restaurant: any;
  units: any[];
  activeUnit: any;
};

export default function DashboardClient({ restaurant, units, activeUnit }: Props) {
  const planLabel = useMemo(() => {
    const p = String(restaurant?.plan ?? "").toLowerCase();
    if (p === "pro") return "PRO";
    return "BASIC";
  }, [restaurant?.plan]);

  const isBasic = planLabel === "BASIC";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          Dashboard — {activeUnit?.name ?? "Unidade"}
        </h1>
        <p className="text-sm text-gray-400">Plano atual: {planLabel}</p>
      </div>

      {isBasic && (
        <div className="rounded-xl border border-yellow-400/30 bg-yellow-200/10 p-4 text-sm text-yellow-100">
          Seu plano BASIC permite apenas <b>1 unidade</b>. Para adicionar mais
          unidades, faça upgrade para PRO.
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-200">Unidade Ativa</div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">{activeUnit?.name}</div>
          <div className="text-sm text-gray-400">Slug: {activeUnit?.slug}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-200">Suas Unidades</div>

        <div className="space-y-2">
          {units.map((unit) => {
            const active = unit.id === activeUnit?.id;
            return (
              <Link
                key={unit.id}
                href={`/dashboard?unit=${unit.id}`}
                className={`block rounded-xl border p-4 transition ${
                  active
                    ? "border-white/30 bg-white/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="font-semibold">{unit.name}</div>
                <div className="text-sm text-gray-400">Slug: {unit.slug}</div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href="/dashboard/unit"
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
        >
          Gerenciar unidades
        </Link>

        <Link
          href="/dashboard/account"
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
        >
          Minha conta
        </Link>
      </div>
    </div>
  );
}
