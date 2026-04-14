import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConfigurarClient from "./ConfigurarClient";

export default async function ConfigurarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // Se já completou onboarding, vai pro dashboard
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, onboarding_completed, name, plan")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurant?.onboarding_completed && restaurant?.plan) redirect("/painel");

  // Auto-provisiona restaurante se não existir
  let restaurantId = restaurant?.id;
  let restaurantName = restaurant?.name ?? "";
  if (!restaurantId) {
    const defaultName = user.email?.split("@")[0] ?? "Meu Restaurante";
    const { data: newRestaurant } = await supabase
      .from("restaurants")
      .insert({
        owner_id: user.id,
        name: defaultName,
        status: "pending",
      })
      .select("id, name")
      .single();
    restaurantId = newRestaurant?.id;
    restaurantName = newRestaurant?.name ?? defaultName;
  }

  if (!restaurantId) {
    return (
      <main
        style={{
          padding: 18,
          maxWidth: 420,
          margin: "0 auto",
          color: "#fff",
          background: "#050505",
          minHeight: "100vh",
        }}
      >
        <p style={{ color: "salmon" }}>
          Erro ao criar restaurante. Tente novamente mais tarde.
        </p>
        <a
          href="/configurar"
          style={{ color: "#fff", textDecoration: "underline" }}
        >
          Tentar novamente
        </a>
      </main>
    );
  }

  return (
    <ConfigurarClient
      restaurantId={restaurantId}
      restaurantName={restaurantName}
      currentPlan={restaurant?.plan ?? null}
    />
  );
}
