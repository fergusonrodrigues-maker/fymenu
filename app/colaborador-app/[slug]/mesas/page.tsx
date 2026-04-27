import MesasClient from "./MesasClient";

export default async function ColaboradorMesasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <MesasClient slug={slug} />;
}
