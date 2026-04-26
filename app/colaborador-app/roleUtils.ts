const ROLE_LABELS: Record<string, string> = {
  waiter: "Garçom",
  chef: "Cozinheiro",
  driver: "Entregador",
  manager: "Gerente",
  cashier: "Caixa",
  cleaner: "Limpeza",
  financial: "Financeiro",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
