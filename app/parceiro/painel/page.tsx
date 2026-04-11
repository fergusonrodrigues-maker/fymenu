import dynamic from "next/dynamic";

const PartnerDashboard = dynamic(() => import("../PartnerDashboard"), { ssr: false });

export default function ParceiroPainelPage() {
  return <PartnerDashboard />;
}
