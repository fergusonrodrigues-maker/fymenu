import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — FyMenu",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100dvh", background: "#0a0a0a" }}>
      {children}
    </div>
  );
}
