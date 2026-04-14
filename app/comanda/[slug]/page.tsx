import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ComandaClient from "./ComandaClient";

export const revalidate = 0;

export default async function ComandaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: comanda } = await supabase
    .from("comandas")
    .select("*, comanda_items(*), mesas(number, label)")
    .eq("short_code", slug.toUpperCase())
    .single();

  if (!comanda) return notFound();

  const { data: unit } = await supabase
    .from("units")
    .select("id, name, slug, logo_url, whatsapp_number")
    .eq("id", comanda.unit_id)
    .single();

  return <ComandaClient comanda={comanda} unit={unit} />;
}
