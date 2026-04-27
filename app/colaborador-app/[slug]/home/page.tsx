import ColaboradorHomeClient from "./ColaboradorHomeClient";

export default async function ColaboradorHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ColaboradorHomeClient slug={slug} />;
}
