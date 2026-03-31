import { createClient } from "@/lib/supabase/client";

interface OrderItem {
  product_id: string;
  category_id: string;
  quantity: number;
  name: string;
}

export async function routeOrderToPrinters(
  unitId: string,
  orderId: string,
  items: OrderItem[]
) {
  const supabase = createClient();

  try {
    // 1. Buscar todos os mapeamentos de impressoras/categorias
    const { data: mappings, error: mappingError } = await supabase
      .from("printer_category_mappings")
      .select(
        `
        printer_config_id,
        category_id,
        printer_configs(id, name, num_copies)
      `
      )
      .in(
        "category_id",
        items.map((i) => i.category_id)
      );

    if (mappingError) throw mappingError;

    // 2. Agrupar itens por impressora
    const printerQueues: Map<string, OrderItem[]> = new Map();

    items.forEach((item) => {
      const printerMapping = mappings?.find(
        (m: any) => m.category_id === item.category_id
      );

      if (printerMapping) {
        const printerId = printerMapping.printer_configs.id;
        if (!printerQueues.has(printerId)) {
          printerQueues.set(printerId, []);
        }
        printerQueues.get(printerId)!.push(item);
      }
    });

    // 3. Criar registros na fila de impressão
    const queueRecords = Array.from(printerQueues.entries()).map(
      ([printerId, printerItems]) => ({
        unit_id: unitId,
        order_intent_id: orderId,
        printer_config_id: printerId,
        order_items: printerItems,
        status: "pending",
      })
    );

    const { error: queueError } = await supabase
      .from("print_queue")
      .insert(queueRecords);

    if (queueError) throw queueError;

    console.log(`Order ${orderId} routed to ${queueRecords.length} printers`);
    return true;
  } catch (error) {
    console.error("Error routing order to printers:", error);
    return false;
  }
}