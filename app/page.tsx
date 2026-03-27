import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LandingPage from "./LandingClient";

export const metadata = {
  title: "FyMenu — Cardápio Digital Inteligente para Restaurantes",
  description: "Cardápio digital com vídeo, swipe, analytics e IA. Feito para restaurantes que querem converter mais.",
  openGraph: {
    title: "FyMenu — Cardápio Digital Inteligente",
    description: "Transforme seu cardápio em uma máquina de vendas.",
  },
};

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/painel");
  return <LandingPage />;
}
