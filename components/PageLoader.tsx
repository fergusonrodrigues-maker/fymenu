"use client";

import FyPulseLoader from "./FyPulseLoader";

export default function PageLoader() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#050505",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FyPulseLoader size="lg" />
    </div>
  );
}
