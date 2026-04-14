import LandingPage from "./LandingClient";

export const metadata = {
  title: "FyMenu — Cardápio Digital Inteligente para Restaurantes",
  description: "Sistema de pedidos com análise completa de dados, parte financeira completa, implementação de IA e infraestrutura interna para sua empresa.",
  openGraph: {
    title: "FyMenu — Cardápio Digital Inteligente",
    description: "Transforme seu cardápio em uma máquina de vendas.",
  },
};

export default function Home() {
  return <LandingPage />;
}
