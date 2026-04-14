"use client";

export default function AIWaveLoader({ size = "sm" }: { size?: "sm" | "md" }) {
  const blockSize = size === "sm" ? 6 : 10;
  const gap = size === "sm" ? 4 : 6;
  const amplitude = size === "sm" ? 8 : 14;

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap,
      height: blockSize + amplitude,
    }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          width: blockSize, height: blockSize,
          borderRadius: 2,
          background: "#fff",
          animation: `aiWave 1.4s ease ${i * 0.15}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes aiWave {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(${amplitude}px); opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}
