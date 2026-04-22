import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ImportacoesClient from "./ImportacoesClient";

export const metadata = { title: "Importações Históricas — FyMenu" };

export default async function ImportacoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, plan, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!restaurant) redirect("/painel");

  const { data: batches } = await supabase
    .from("import_batches")
    .select("id, target_table, source_method, source_filename, records_count, date_range_start, date_range_end, status, created_at, reverted_at, notes")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <ImportacoesClient
      batches={batches ?? []}
      restaurantPlan={restaurant.plan ?? "free"}
    />
  );
}
