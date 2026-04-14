"use client";

export default function FyPulseLoader({
  size = "md",
  text,
}: {
  size?: "sm" | "md" | "lg";
  text?: string;
}) {
  const sizes = {
    sm: { width: 40, border: "0.4rem", fontSize: 10 },
    md: { width: 64, border: "0.6rem", fontSize: 12 },
    lg: { width: 96, border: "0.9rem", fontSize: 14 },
  };
  const s = sizes[size];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    }}>
      {/* Pulse ring */}
      <div style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: s.width,
        height: s.width,
      }}>
        {/* Inner ring — pulses inward */}
        <div style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          animation: "fyPulsIn 1.8s ease-in-out infinite",
          filter: "drop-shadow(0 0 1rem rgba(0,255,174,0.4))",
        }} />
        {/* Outer ring — pulses outward, offset by half a cycle */}
        <div style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          animation: "fyPulsOut 1.8s ease-in-out infinite",
          filter: "drop-shadow(0 0 1rem rgba(0,255,174,0.4))",
        }} />
      </div>

      {text && (
        <div style={{
          fontSize: s.fontSize,
          fontWeight: 600,
          color: "rgba(255,255,255,0.3)",
          letterSpacing: 1,
        }}>
          {text}
        </div>
      )}

      <style>{`
        @keyframes fyPulsIn {
          0% {
            box-shadow: inset 0 0 0 ${s.border} #00ffae;
            opacity: 1;
          }
          50%, 100% {
            box-shadow: inset 0 0 0 0 #00ffae;
            opacity: 0;
          }
        }
        @keyframes fyPulsOut {
          0%, 50% {
            box-shadow: 0 0 0 0 #00ffae;
            opacity: 0;
          }
          100% {
            box-shadow: 0 0 0 ${s.border} #00ffae;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
