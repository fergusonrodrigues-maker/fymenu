// FILE: /app/dashboard/unit/page.tsx
// ACTION: REPLACE ENTIRE FILE

import { getUnitForDashboard, updateUnitInfo } from "../actions";
import LogoUploader from "../LogoUploader";

export default async function UnitPage() {
  const unit = await getUnitForDashboard();

  // LogoUploader pode ser client e pode ter props diferentes dependendo de como você criou.
  // Pra não dar erro de TypeScript por props, usamos "as any" e passamos unitId (se ele aceitar).
  const LogoUploaderAny = LogoUploader as any;

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Configurações da Unidade</h1>
        <p className="text-sm text-white/60">
          Atualize as informações da sua empresa. A logo será usada no Dashboard e no público.
        </p>
      </div>

      {/* Logo */}
      <section className="space-y-3 rounded-2xl bg-white/5 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Logo da empresa</h2>
            <p className="text-xs text-white/50">
              Essa logo é salva em <span className="text-white/70">units.logo_url</span>.
            </p>
          </div>

          {unit?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={unit.logo_url}
              alt={`Logo ${unit?.name ?? "Unidade"}`}
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-white/10" />
          )}
        </div>

        {/* Uploader (edição) */}
        <LogoUploaderAny unitId={unit?.id} />
      </section>

      {/* Form de dados da unidade */}
      <form action={updateUnitInfo} className="space-y-4 rounded-2xl bg-white/5 p-4 backdrop-blur">
        <div className="space-y-1">
          <label className="text-sm text-white/70">Nome da Unidade</label>
          <input
            name="name"
            defaultValue={unit?.name ?? ""}
            required
            className="w-full rounded-xl bg-white/10 p-3 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-white/70">Slug (URL pública)</label>
          <input
            name="slug"
            defaultValue={unit?.slug ?? ""}
            required
            className="w-full rounded-xl bg-white/10 p-3 outline-none"
          />
          <p className="text-xs text-white/40">
            URL final: fymenu.com/u/{unit?.slug ?? ""}
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-white/70">Endereço / Maps</label>
          <input
            name="address"
            defaultValue={unit?.address ?? ""}
            className="w-full rounded-xl bg-white/10 p-3 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-white/70">Instagram</label>
          <input
            name="instagram"
            defaultValue={unit?.instagram ?? ""}
            className="w-full rounded-xl bg-white/10 p-3 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-white/70">WhatsApp</label>
          <input
            name="whatsapp"
            defaultValue={(unit as any)?.whatsapp ?? ""}
            className="w-full rounded-xl bg-white/10 p-3 outline-none"
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-white px-4 py-2 text-black font-medium hover:opacity-90"
        >
          Salvar alterações
        </button>
      </form>
    </div>
  );
}