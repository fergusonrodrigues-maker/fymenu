import ComandasClient from "./ComandasClient";

export default async function ColaboradorComandasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ComandasClient slug={slug} />;
}
