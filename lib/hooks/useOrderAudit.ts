import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface AuditLog {
  id: string;
  order_id: string;
  action: "item_added" | "item_removed" | "price_changed" | "status_changed";
  product_name: string;
  details: string;
  changed_by: string;
  created_at: string;
}

export function useOrderAudit(orderId?: string) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchAuditLogs = useCallback(
    async (id: string) => {
      setLoading(true);

      try {
        const { data, error: err } = await supabase
          .from("order_audit_logs")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: false });

        if (err) throw err;
        setLogs(data || []);
      } catch (error) {
        console.error("Error fetching audit logs:", error);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const logAction = useCallback(
    async (
      action: AuditLog["action"],
      productName: string,
      details: string,
      changedBy: string
    ) => {
      if (!orderId) return false;

      try {
        const { error: err } = await supabase
          .from("order_audit_logs")
          .insert([
            {
              order_id: orderId,
              action,
              product_name: productName,
              details,
              changed_by: changedBy,
            },
          ]);

        if (err) throw err;
        return true;
      } catch (error) {
        console.error("Error logging action:", error);
        return false;
      }
    },
    [orderId, supabase]
  );

  return { logs, loading, fetchAuditLogs, logAction };
}
