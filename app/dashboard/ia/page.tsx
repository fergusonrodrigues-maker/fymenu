import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ImportClient from "./ImportClient";

export default async function IAPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: unit } = await supabase
    .from("units")
    .select("id, name, slug")
    .eq("owner_id", user.id)
    .single();

  if (!unit) redirect("/dashboard");

  return <ImportClient unitId={unit.id} unitName={unit.name} />;
}
