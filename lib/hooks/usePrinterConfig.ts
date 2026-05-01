import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// Supabase PostgrestError isn't an Error instance, so `e instanceof Error`
// is false and we'd fall back to "Unknown error" and lose the real cause
// (CHECK violations, RLS denials, etc). Pull whichever fields exist.
function extractErrMessage(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "object") {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [o.message, o.details, o.hint, o.code]
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    if (parts.length > 0) return parts.join(" — ");
  }
  try { return JSON.stringify(e); } catch { return "Unknown error"; }
}

export interface PrinterConfig {
  id: string;
  unit_id: string;
  name: string;
  num_copies: number;
  type?: string | null;            // 'thermal' | 'thermal_browser' | 'thermal_bluetooth' | 'thermal_usb' | 'pdf'
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
        const msg = extractErrMessage(e);
        console.error("[usePrinterConfig]", msg, e);
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
              type: input.type ?? "thermal_browser",
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
        const msg = extractErrMessage(e);
        console.error("[usePrinterConfig]", msg, e);
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
        const msg = extractErrMessage(e);
        console.error("[usePrinterConfig]", msg, e);
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
        const msg = extractErrMessage(e);
        console.error("[usePrinterConfig]", msg, e);
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
        const msg = extractErrMessage(e);
        console.error("[usePrinterConfig]", msg, e);
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
        const msg = extractErrMessage(e);
        console.error("[usePrinterConfig]", msg, e);
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
        const msg = extractErrMessage(e);
        console.error("[usePrinterConfig]", msg, e);
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