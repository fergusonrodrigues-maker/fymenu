import ComandaDetailClient from "./ComandaDetailClient";

export default async function ColaboradorComandaDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return <ComandaDetailClient slug={slug} comandaId={id} />;
}
