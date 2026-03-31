export const metadata = {
  title: "FyMenu - Cardápio Digital",
};

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      {children}
    </div>
  );
}
