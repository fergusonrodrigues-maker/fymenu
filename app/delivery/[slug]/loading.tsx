"use client";
import FyLoader from "@/components/FyLoader";
export default function Loading() {
  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <FyLoader size="lg" />
    </div>
  );
}
