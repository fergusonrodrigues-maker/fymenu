"use client";

export default function FyLoader({
  size = "md",
  text,
}: {
  size?: "sm" | "md" | "lg";
  text?: string;
}) {
  const sizes = {
    sm: { logo: 20, text: 10, gap: 6 },
    md: { logo: 32, text: 11, gap: 10 },
    lg: { logo: 48, text: 13, gap: 14 },
  };
  const s = sizes[size];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
      }}
    >
      <style>{`
        @keyframes fyPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.95); filter: drop-shadow(0 0 6px rgba(0,255,174,0.15)); }
          50% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 16px rgba(0,255,174,0.35)); }
        }
      `}</style>

      <div
        style={{
          fontSize: s.logo,
          fontWeight: 900,
          fontStyle: "italic",
          color: "#00ffae",
          animation: "fyPulse 1.5s ease-in-out infinite",
          textShadow: "0 0 20px rgba(0,255,174,0.3), 0 0 40px rgba(0,255,174,0.1)",
          fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
          letterSpacing: "-0.5px",
          userSelect: "none",
        }}
      >
        fy<span style={{ color: "rgba(255,255,255,0.7)" }}>.</span>
      </div>

      {text && (
        <div
          style={{
            fontSize: s.text,
            color: "rgba(255,255,255,0.25)",
            fontWeight: 500,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
