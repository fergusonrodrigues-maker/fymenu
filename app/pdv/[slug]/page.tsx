"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";

// PDVClient lives under the delivery route but is imported directly
const PDVClient = dynamic(
  () => import("@/app/delivery/[slug]/pdv/PDVClient"),
  { ssr: false }
);

const supabase = createClient();

export default function PDVSlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [unit, setUnit] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [initialOrders, setInitialOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const empId = localStorage.getItem("fy_employee_id");
    if (!empId) { router.replace("/funcionario/login"); return; }

    async function load() {
      const { data: unitData } = await supabase
        .from("units")
        .select("id, name, slug, restaurant_id")
        .eq("slug", slug)
        .single();

      if (!unitData) { setLoading(false); return; }
      setUnit(unitData);

      const { data: rest } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", unitData.restaurant_id)
        .single();
      if (rest) setRestaurant(rest);

      const { data: orders } = await supabase
        .from("order_intents")
        .select("id, table_number, items, total, status, kitchen_status, waiter_status, notes, created_at, payment_method, paid_at")
        .eq("unit_id", unitData.id)
        .eq("status", "confirmed")
        .neq("kitchen_status", "cancelled")
        .order("created_at", { ascending: false });

      setInitialOrders(orders ?? []);
      setLoading(false);
    }
    load();
  }, [slug, router]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)" }}>
      Carregando...
    </div>
  );

  if (!unit) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171" }}>
      Unidade não encontrada
    </div>
  );

  return (
    <PDVClient
      unitId={unit.id}
      unitName={unit.name}
      restaurantName={restaurant?.name ?? ""}
      slug={slug}
      initialOrders={initialOrders}
    />
  );
}
