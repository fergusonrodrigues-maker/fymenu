import TarefasClient from "./TarefasClient";

export default async function ColaboradorTarefasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TarefasClient slug={slug} />;
}
