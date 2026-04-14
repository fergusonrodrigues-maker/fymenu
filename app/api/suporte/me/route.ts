import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-suporte-token");
  if (!token)
    return NextResponse.json({ error: "Token ausente" }, { status: 401 });

  const admin = createAdminClient();
  const { data: staff } = await admin
    .from("support_staff")
    .select("id, name, email, role, is_active, permissions")
    .eq("current_token", token)
    .single();

  if (!staff || !staff.is_active)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  return NextResponse.json({ staff });
}
