"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";

const WaiterClient = dynamic(() => import("../WaiterClient"), { ssr: false });

const supabase = createClient();

export default function GarcomSlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [unit, setUnit] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [initialOrders, setInitialOrders] = useState<any[]>([]);
  const [initialComandas, setInitialComandas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string>("");

  useEffect(() => {
    const empId = localStorage.getItem("fy_employee_id");
    if (!empId) { router.replace("/funcionario/login"); return; }
    setEmployeeId(empId);

    async function load() {
      const { data: unitData } = await supabase
        .from("units")
        .select("id, name, slug, comanda_close_permission, restaurant_id")
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

      const [{ data: orders }, { data: comandas }] = await Promise.all([
        supabase
          .from("order_intents")
          .select("id, table_number, items, total, status, waiter_status, kitchen_status, notes, created_at, waiter_confirmed_at")
          .eq("unit_id", unitData.id)
          .neq("waiter_status", "delivered")
          .order("created_at", { ascending: false }),
        supabase
          .from("comandas")
          .select("id, table_number, hash, status, opened_by_name, created_at, total, comanda_items(count)")
          .eq("unit_id", unitData.id)
          .eq("status", "open")
          .order("created_at", { ascending: false }),
      ]);

      setInitialOrders(orders ?? []);
      setInitialComandas(comandas ?? []);
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
    <WaiterClient
      unitId={unit.id}
      unitName={unit.name}
      unitSlug={unit.slug}
      restaurantName={restaurant?.name ?? ""}
      canCloseComanda={(unit.comanda_close_permission ?? "somente_caixa") === "garcom_e_caixa"}
      initialOrders={initialOrders}
      userId={employeeId}
      initialComandas={initialComandas}
    />
  );
}
