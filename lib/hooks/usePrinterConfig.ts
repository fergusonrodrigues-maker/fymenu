import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PrinterConfig {
  id: string;
  unit_id: string;
  name: string;
  num_copies: number;
  type?: string | null;            // 'browser' | 'bluetooth' | 'usb'
  purpose?: string | null;         // 'kitchen' | 'cashier' | 'generic'
  paper_width?: number | null;     // 80 | 58 (mm)
  print_logo?: boolean | null;
  footer_message?: string | null;
  is_active?: boolean | null;
  created_at: string;
}

export type PrinterCreateInput = {
  name: string;
  numCopies?: number;
  type?: string;
  purpose?: string;
  paperWidth?: number;
  printLogo?: boolean;
  footerMessage?: string;
  isActive?: boolean;
};

export function usePrinterConfig(unitId?: string) {
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchPrinters = useCallback(
    async (unit: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("printer_configs")
          .select("*")
          .eq("unit_id", unit)
          .order("name");

        if (err) throw err;
        setPrinters(data || []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const createPrinter = useCallback(
    async (
      nameOrInput: string | PrinterCreateInput,
      numCopies: number = 1,
    ) => {
      if (!unitId) {
        setError("unitId is required");
        return null;
      }

      const input: PrinterCreateInput = typeof nameOrInput === "string"
        ? { name: nameOrInput, numCopies }
        : nameOrInput;

      try {
        const { data, error: err } = await supabase
          .from("printer_configs")
          .insert([
            {
              unit_id: unitId,
              name: input.name,
              num_copies: input.numCopies ?? 1,
              type: input.type ?? "browser",
              purpose: input.purpose ?? "kitchen",
              paper_width: input.paperWidth ?? 80,
              print_logo: input.printLogo ?? true,
              footer_message: input.footerMessage ?? null,
              is_active: input.isActive ?? true,
            },
          ])
          .select()
          .single();

        if (err) throw err;
        setPrinters([...printers, data]);
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return null;
      }
    },
    [unitId, printers, supabase]
  );

  const updatePrinter = useCallback(
    async (printerId: string, updates: Partial<PrinterConfig>) => {
      try {
        const { data, error: err } = await supabase
          .from("printer_configs")
          .update(updates)
          .eq("id", printerId)
          .select()
          .single();

        if (err) throw err;
        setPrinters(printers.map((p) => (p.id === printerId ? data : p)));
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return null;
      }
    },
    [printers, supabase]
  );

  const deletePrinter = useCallback(
    async (printerId: string) => {
      try {
        const { error: err } = await supabase
          .from("printer_configs")
          .delete()
          .eq("id", printerId);

        if (err) throw err;
        setPrinters(printers.filter((p) => p.id !== printerId));
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return false;
      }
    },
    [printers, supabase]
  );

  const getPrinterCategories = useCallback(
    async (printerId: string) => {
      try {
        const { data, error: err } = await supabase
          .from("printer_category_mappings")
          .select("id, category_id, categories(name)")
          .eq("printer_config_id", printerId);

        if (err) throw err;
        return (data as any[]) || [];
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return [];
      }
    },
    [supabase]
  );

  const addCategoryToprinter = useCallback(
    async (printerId: string, categoryId: string) => {
      try {
        const { data, error: err } = await supabase
          .from("printer_category_mappings")
          .insert([
            {
              printer_config_id: printerId,
              category_id: categoryId,
            },
          ])
          .select()
          .single();

        if (err) throw err;
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return null;
      }
    },
    [supabase]
  );

  const removeCategoryFromPrinter = useCallback(
    async (mappingId: string) => {
      try {
        const { error: err } = await supabase
          .from("printer_category_mappings")
          .delete()
          .eq("id", mappingId);

        if (err) throw err;
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return false;
      }
    },
    [supabase]
  );

  return {
    printers,
    loading,
    error,
    fetchPrinters,
    createPrinter,
    updatePrinter,
    deletePrinter,
    getPrinterCategories,
    addCategoryToprinter,
    removeCategoryFromPrinter,
  };
}