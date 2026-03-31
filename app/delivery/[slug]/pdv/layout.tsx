import { KitchenAlertProvider } from "@/lib/context/KitchenAlertContext";
import { AudioControlButton } from "@/components/AudioControlButton";

export default async function PDVLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <KitchenAlertProvider>
      <div className="flex flex-col h-screen">
        <header className="flex justify-between items-center p-4 border-b bg-white dark:bg-gray-900">
          <h1 className="text-lg font-bold">PDV - {slug}</h1>
          <AudioControlButton />
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </KitchenAlertProvider>
  );
}
