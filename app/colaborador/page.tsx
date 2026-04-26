import Link from "next/link";

export const metadata = {
  title: "Portal do Colaborador — FyMenu",
};

export default function ColaboradorLandingPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#fafafa",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "24px 16px",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: "40px 32px",
        maxWidth: 420,
        width: "100%",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>
          Portal do Colaborador
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, margin: "0 0 24px" }}>
          Para acessar o portal, utilize o subdomínio da sua unidade.
        </p>
        <div style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 28,
          textAlign: "left",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 6 }}>
            Exemplo de acesso
          </div>
          <code style={{ fontSize: 13, color: "#16a34a", fontWeight: 600, wordBreak: "break-all" }}>
            suaunidade.fymenu.com/colaborador
          </code>
        </div>
        <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 24px" }}>
          Não sabe o endereço? Consulte seu gerente ou responsável pela unidade.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            borderRadius: 10,
            border: "1.5px solid #e5e7eb",
            color: "#374151",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ← Voltar para o início
        </Link>
      </div>
    </div>
  );
}
