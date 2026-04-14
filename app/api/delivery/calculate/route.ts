import { NextRequest, NextResponse } from "next/server";
import { calculateDeliveryFee } from "@/lib/delivery-calculator";

// POST /api/delivery/calculate — public endpoint (no auth required)
// Body: { unit_id, latitude, longitude }
export async function POST(req: NextRequest) {
  try {
    const { unit_id, latitude, longitude } = await req.json();
    if (!unit_id || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "unit_id, latitude e longitude são obrigatórios" }, { status: 400 });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!isFinite(lat) || !isFinite(lon)) {
      return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
    }

    const result = await calculateDeliveryFee(unit_id, lat, lon);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
