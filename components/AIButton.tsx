"use client";
import AIWaveLoader from "./AIWaveLoader";

interface AIButtonProps {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  onClick: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function AIButton({
  label,
  loadingLabel,
  loading,
  onClick,
  disabled,
  fullWidth,
  size = "md",
}: AIButtonProps) {
  const sizes = {
    sm: { padding: "6px 14px", fontSize: 11, iconSize: 13, loaderSize: "sm" as const, radius: 10, minH: 30 },
    md: { padding: "10px 18px", fontSize: 12, iconSize: 15, loaderSize: "sm" as const, radius: 10, minH: 38 },
    lg: { padding: "14px 24px", fontSize: 14, iconSize: 17, loaderSize: "md" as const, radius: 14, minH: 48 },
  };
  const s = sizes[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: s.padding,
        borderRadius: s.radius,
        border: "none",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        background: "linear-gradient(135deg, #7c3aed, #a855f7, #c084fc)",
        color: "#ffffff",
        fontSize: s.fontSize,
        fontWeight: 700,
        width: fullWidth ? "100%" : "auto",
        boxShadow:
          "0 1px 0 rgba(168,85,247,0.2) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 4px 16px rgba(124,58,237,0.15)",
        opacity: disabled ? 0.4 : loading ? 0.85 : 1,
        transition: "all 0.2s",
        minHeight: s.minH,
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        if (!loading && !disabled) {
          e.currentTarget.style.boxShadow =
            "0 1px 0 rgba(168,85,247,0.25) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 6px 24px rgba(124,58,237,0.25)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow =
          "0 1px 0 rgba(168,85,247,0.2) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 4px 16px rgba(124,58,237,0.15)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {loading ? (
        <>
          <AIWaveLoader size={s.loaderSize} />
          <span style={{ marginLeft: 4 }}>{loadingLabel ?? "Processando..."}</span>
        </>
      ) : (
        <>
          <span style={{ fontSize: s.iconSize, filter: "drop-shadow(0 0 4px rgba(251,191,36,0.4))" }}>✨</span>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
