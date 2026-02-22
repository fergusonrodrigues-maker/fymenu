import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  return (
    <main style={{ padding: 18, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 900 }}>Dashboard</h1>
      <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
        Logado como: <b>{data.user.email}</b>
      </div>

      <div style={{ marginTop: 18, padding: 14, borderRadius: 12, border: "1px solid rgba(0,0,0,0.10)" }}>
        Próximo: aqui vamos listar unidades do cliente e botar botão “Criar Unidade”.
      </div>

      <form
        action={async () => {
          "use server";
          const supabase = await createClient();
          await supabase.auth.signOut();
          redirect("/login");
        }}
        style={{ marginTop: 16 }}
      >
        <button style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}>
          Sair
        </button>
      </form>
    </main>
  );
}