// Delivery fee calculator using Haversine distance formula.
// Server-side only — uses admin client.

import { createAdminClient } from "@/lib/supabase/admin";

// ─── Haversine ────────────────────────────────────────────────────────────────

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Result type ──────────────────────────────────────────────────────────────

export interface DeliveryFeeResult {
  available: boolean;
  distanceKm: number | null;
  fee: number; // cents
  message: string;
}

// ─── Main calculator ──────────────────────────────────────────────────────────

export async function calculateDeliveryFee(
  unitId: string,
  customerLat: number,
  customerLon: number
): Promise<DeliveryFeeResult> {
  const admin = createAdminClient();

  // 1. Fetch unit delivery config
  const { data: unit } = await admin
    .from("units")
    .select("delivery_enabled, delivery_latitude, delivery_longitude, delivery_max_km")
    .eq("id", unitId)
    .single();

  if (!unit) {
    return { available: false, distanceKm: null, fee: 0, message: "Unidade não encontrada" };
  }
  if (!(unit as any).delivery_enabled) {
    return { available: false, distanceKm: null, fee: 0, message: "Delivery não disponível nesta unidade" };
  }
  if (!(unit as any).delivery_latitude || !(unit as any).delivery_longitude) {
    return { available: false, distanceKm: null, fee: 0, message: "Endereço do restaurante não configurado" };
  }

  // 2. Calculate distance
  const distanceKm = haversineDistance(
    Number((unit as any).delivery_latitude),
    Number((unit as any).delivery_longitude),
    customerLat,
    customerLon
  );

  const maxKm = Number((unit as any).delivery_max_km) || 10;

  if (distanceKm > maxKm) {
    return {
      available: false,
      distanceKm,
      fee: 0,
      message: `Fora da área de entrega (raio máximo: ${maxKm} km)`,
    };
  }

  // 3. Get active delivery zones
  const { data: zones } = await admin
    .from("delivery_zones")
    .select("min_km, max_km, fee")
    .eq("unit_id", unitId)
    .eq("is_active", true)
    .order("min_km", { ascending: true });

  if (!zones || zones.length === 0) {
    return { available: false, distanceKm, fee: 0, message: "Faixas de entrega não configuradas" };
  }

  // 4. Find matching zone: min_km <= distance < max_km
  const zone = zones.find(
    (z) => distanceKm >= Number(z.min_km) && distanceKm < Number(z.max_km)
  );

  if (!zone) {
    return {
      available: false,
      distanceKm,
      fee: 0,
      message: "Distância fora das faixas configuradas",
    };
  }

  const fmtFee = `R$ ${(zone.fee / 100).toFixed(2).replace(".", ",")}`;
  return {
    available: true,
    distanceKm,
    fee: zone.fee,
    message: `Taxa de entrega: ${fmtFee}`,
  };
}
