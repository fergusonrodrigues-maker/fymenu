import { requireFeatureOrRedirect } from "@/lib/server/requireFeatureOrRedirect";

export default async function OrderDetailLayout({ children }: { children: React.ReactNode }) {
  await requireFeatureOrRedirect("whatsappOrders");
  return <>{children}</>;
}
