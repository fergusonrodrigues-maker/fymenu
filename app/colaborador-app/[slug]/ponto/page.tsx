import PontoClient from "./PontoClient";

export default async function ColaboradorPontoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PontoClient slug={slug} />;
}
