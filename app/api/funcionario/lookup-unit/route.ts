import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/funcionario/lookup-unit
 * Recebe { accessCode } e retorna dados básicos da unidade.
 * Aceita: CNPJ (14 dígitos) ou código de acesso alternativo (10 dígitos).
 * Remove pontuação antes de buscar.
 */
export async function POST(req: NextRequest) {
  const { accessCode } = await req.json();
  if (!accessCode)
    return NextResponse.json({ error: "Código obrigatório" }, { status: 400 });

  const normalized = accessCode.replace(/[\.\-\/\s]/g, "");
  if (normalized.length < 10)
    return NextResponse.json(
      { error: "Código muito curto. Use o CNPJ ou código de acesso da empresa." },
      { status: 400 }
    );

  const admin = createAdminClient();

  // Try access_code first, then cnpj
  const { data: unit } = await admin
    .from("units")
    .select("id, name, logo_url, slug")
    .or(`access_code.eq.${normalized},cnpj.eq.${normalized}`)
    .eq("is_published", true)
    .maybeSingle();

  if (!unit)
    return NextResponse.json(
      { error: "Empresa não encontrada. Verifique o código." },
      { status: 404 }
    );

  return NextResponse.json({
    unit: {
      id: unit.id,
      name: unit.name,
      logo_url: unit.logo_url ?? null,
      slug: unit.slug,
    },
  });
}
