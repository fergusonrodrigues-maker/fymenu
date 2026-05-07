// Server-rendered placeholder shown when the restaurant's plan doesn't include
// the feature this employee tab tries to use. Employees can't upgrade — just
// nudge them to talk to the manager.

export default function FeatureUnavailable({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        textAlign: "center",
        gap: 12,
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ fontSize: 48, lineHeight: 1 }}>🔒</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 14, opacity: 0.7, maxWidth: 360, lineHeight: 1.5, margin: 0 }}>
        {description}
      </p>
      <p style={{ fontSize: 12, opacity: 0.45, marginTop: 8 }}>
        Fale com o gestor do restaurante pra liberar.
      </p>
    </div>
  );
}
