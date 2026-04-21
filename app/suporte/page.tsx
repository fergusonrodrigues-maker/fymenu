"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuportePage() {
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem("suporte_token");
    if (token) {
      router.replace("/suporte/dashboard");
    } else {
      router.replace("/suporte/login");
    }
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: "2px solid rgba(124,58,237,0.3)",
        borderTopColor: "#7c3aed",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
