import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import RastreioClient from "./RastreioClient";

export const revalidate = 0;

export default async function RastreioPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: tracking } = await supabase
    .from("delivery_tracking")
    .select("*")
    .eq("tracking_code", code.toUpperCase())
    .single();

  if (!tracking) return notFound();

  const [{ data: order }, { data: unit }] = await Promise.all([
    supabase
      .from("order_intents")
      .select("id, total, customer_name, status, items")
      .eq("id", tracking.order_intent_id)
      .single(),
    supabase
      .from("units")
      .select("id, name, logo_url")
      .eq("id", tracking.unit_id)
      .single(),
  ]);

  return <RastreioClient tracking={tracking} order={order} unit={unit} />;
}
