"use client";

import { useEffect, useState } from "react";
import { usePrinterConfig } from "@/lib/hooks/usePrinterConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit2, Plus } from "lucide-react";

interface PrinterSettingsProps {
  unitId: string;
  categories: Array<{ id: string; name: string }>;
}

export function PrinterSettings({
  unitId,
  categories,
}: PrinterSettingsProps) {
  const {
    printers,
    fetchPrinters,
    createPrinter,
    deletePrinter,
    getPrinterCategories,
    addCategoryToprinter,
  } = usePrinterConfig(unitId);

  const [newPrinterName, setNewPrinterName] = useState("");
  const [expandedPrinterId, setExpandedPrinterId] = useState<string | null>(
    null
  );
  const [printerCategoryMap, setPrinterCategoryMap] = useState
    Map<string, any[]>
  >(new Map());

  useEffect(() => {
    fetchPrinters(unitId);
  }, [unitId, fetchPrinters]);

  const handleCreatePrinter = async () => {
    if (!newPrinterName.trim()) return;

    const result = await createPrinter(newPrinterName);
    if (result) {
      setNewPrinterName("");
    }
  };

  const handleExpandPrinter = async (printerId: string) => {
    setExpandedPrinterId(printerId);

    if (!printerCategoryMap.has(printerId)) {
      const cats = await getPrinterCategories(printerId);
      printerCategoryMap.set(printerId, cats);
      setPrinterCategoryMap(new Map(printerCategoryMap));
    }
  };

  const handleAddCategory = async (printerId: string, categoryId: string) => {
    const result = await addCategoryToprinter(printerId, categoryId);
    if (result) {
      const cats = await getPrinterCategories(printerId);
      printerCategoryMap.set(printerId, cats);
      setPrinterCategoryMap(new Map(printerCategoryMap));
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Configuração de Impressoras</h3>

      <div className="flex gap-2">
        <Input
          placeholder="Nome da impressora (ex: Cozinha, Bebidas)"
          value={newPrinterName}
          onChange={(e) => setNewPrinterName(e.target.value)}
        />
        <Button onClick={handleCreatePrinter} disabled={!newPrinterName}>
          <Plus size={16} className="mr-2" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        {printers.length === 0 ? (
          <p className="text-gray-500 text-sm">
            Nenhuma impressora configurada
          </p>
        ) : (
          printers.map((printer) => (
            <div
              key={printer.id}
              className="border rounded-lg p-3 bg-gray-50"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{printer.name}</p>
                  <p className="text-xs text-gray-600">
                    Cópias: {printer.num_copies}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExpandPrinter(printer.id)}
                  >
                    {expandedPrinterId === printer.id ? "Recolher" : "Expandir"}
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deletePrinter(printer.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              {expandedPrinterId === printer.id && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <p className="text-sm font-semibold">
                    Categorias desta impressora:
                  </p>

                  {printerCategoryMap.get(printer.id) && (
                    <div className="space-y-1">
                      {printerCategoryMap.get(printer.id)?.map((cat: any) => (
                        <div
                          key={cat.category_id}
                          className="flex justify-between items-center p-2 bg-white rounded border"
                        >
                          <span className="text-sm">
                            {cat.categories?.name || cat.category_id}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500"
                          >
                            X
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <select
                    className="w-full p-2 border rounded text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddCategory(printer.id, e.target.value);
                        e.target.value = "";
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Adicionar categoria...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}