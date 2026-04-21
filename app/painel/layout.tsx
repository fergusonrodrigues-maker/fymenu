import type { Metadata } from "next";
import PainelSessionGuard from "./PainelSessionGuard";

export const metadata: Metadata = {
  title: "Dashboard — FyMenu",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100dvh", background: "var(--dash-bg)" }}>
      <PainelSessionGuard />
      {children}
    </div>
  );
}
