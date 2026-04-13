"use client";

import { useEffect } from "react";
import { useOrderAudit } from "@/lib/hooks/useOrderAudit";
import FyLoader from "@/components/FyLoader";

interface AuditHistoryProps {
  orderId: string;
}

export function AuditHistory({ orderId }: AuditHistoryProps) {
  const { logs, loading, fetchAuditLogs } = useOrderAudit(orderId);

  useEffect(() => {
    fetchAuditLogs(orderId);
  }, [orderId, fetchAuditLogs]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}><FyLoader size="sm" /></div>;

  return (
    <div className="space-y-2 p-3 bg-gray-50 rounded border text-sm">
      <h4 className="font-semibold text-xs">Histórico de Alterações</h4>

      {logs.length === 0 ? (
        <p className="text-gray-400 text-xs">Nenhuma alteração registrada</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="text-xs p-1 bg-white rounded border-l-2 border-blue-300">
              <div className="flex justify-between">
                <span className="font-medium">{log.product_name}</span>
                <span className="text-gray-500">
                  {new Date(log.created_at).toLocaleTimeString("pt-BR")}
                </span>
              </div>
              <p className="text-gray-600">{log.details}</p>
              <p className="text-gray-400">Por: {log.changed_by}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
