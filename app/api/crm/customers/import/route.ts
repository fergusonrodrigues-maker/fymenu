import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRestaurantMember } from "@/lib/tenant/isRestaurantMember";

interface ImportRow {
  name: string;
  phone: string;
  address?: string;
  neighborhood?: string;
  city?: string;
}

function cleanPhone(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { unitId, customers, onDuplicate = "skip" } = await req.json() as {
      unitId: string;
      customers: ImportRow[];
      onDuplicate?: "skip" | "update";
    };

    if (!unitId || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({ error: "unitId e customers são obrigatórios" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: unit } = await admin
      .from("units")
      .select("id, restaurant_id")
      .eq("id", unitId)
      .single();
    if (!unit || !await isRestaurantMember(admin, user.id, (unit as any).restaurant_id)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // Load existing phones for this unit to detect duplicates in bulk
    const { data: existingRows } = await admin
      .from("crm_customers")
      .select("id, phone")
      .eq("unit_id", unitId)
      .not("phone", "is", null);

    const existingPhones = new Map<string, string>();
    for (const r of existingRows ?? []) {
      if (r.phone) existingPhones.set(r.phone, r.id);
    }

    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (const row of customers) {
      const name = String(row.name ?? "").trim();
      const phone = cleanPhone(row.phone ?? "");

      if (!name || phone.length < 10 || phone.length > 11) {
        errors++;
        continue;
      }

      if (existingPhones.has(phone)) {
        if (onDuplicate === "update") {
          const id = existingPhones.get(phone)!;
          const { error } = await admin
            .from("crm_customers")
            .update({
              name,
              address: row.address?.trim() || null,
              neighborhood: row.neighborhood?.trim() || null,
              city: row.city?.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
          if (error) { errors++; } else { imported++; }
        } else {
          duplicates++;
        }
        continue;
      }

      const { error } = await admin
        .from("crm_customers")
        .insert({
          unit_id: unitId,
          name,
          phone,
          address: row.address?.trim() || null,
          neighborhood: row.neighborhood?.trim() || null,
          city: row.city?.trim() || null,
          source: "import",
          total_orders: 0,
          total_spent: 0,
        });

      if (error) { errors++; } else {
        imported++;
        existingPhones.set(phone, "inserted");
      }
    }

    return NextResponse.json({ imported, duplicates, errors });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
