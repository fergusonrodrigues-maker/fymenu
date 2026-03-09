import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import TVDisplay from "./TVDisplay";

export const dynamic = "force-dynamic";

export default async function TVPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await createClient();

  const { data: unit } = await supabase
    .from("units")
    .select("id, name, slug, restaurant_id")
    .eq("slug", params.slug)
    .eq("is_published", true)
    .single();

  if (!unit) notFound();

  const { data: media } = await supabase
    .from("tv_media")
    .select("id, title, video_path, thumb_path, orientation, order_index, is_active")
    .eq("unit_id", unit.id)
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  return <TVDisplay unit={unit} media={media ?? []} />;
}