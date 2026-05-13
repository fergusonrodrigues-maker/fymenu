import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ConfigurarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  redirect("/painel");
}
