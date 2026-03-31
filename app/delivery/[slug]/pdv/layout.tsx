import { KitchenAlertProvider } from "@/lib/context/KitchenAlertContext";
import { AudioControlButton } from "@/components/AudioControlButton";

export default function PDVLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  return (
    <KitchenAlertProvider>
      <div className="flex flex-col h-screen">
        {/* Header com controle de áudio */}
        <header className="flex justify-between items-center p-4 border-b bg-white dark:bg-gray-900">
          <h1 className="text-lg font-bold">PDV - {params.slug}</h1>

          <AudioControlButton />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </KitchenAlertProvider>
  );
}
