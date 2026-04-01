"use client";

interface Props {
  comanda: any;
  initialItems: any[];
  categories: any[];
  products: any[];
  unitId: string;
  unitSlug: string;
  unitName: string;
  restaurantId: string;
  userId: string;
  waiterName: string;
  canClose: boolean;
}

export default function ComandaGarcomClient(_props: Props) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Comanda em desenvolvimento.</p>
    </div>
  );
}
