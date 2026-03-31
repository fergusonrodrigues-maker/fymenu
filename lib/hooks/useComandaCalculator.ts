import { useState, useCallback } from "react";

interface CalculatorState {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export function useComandaCalculator(initialItems: CalculatorState["items"] = []) {
  const [calculator, setCalculator] = useState<CalculatorState>({
    items: initialItems,
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
  });

  const recalculate = useCallback((state: CalculatorState) => {
    const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.1; // 10% example
    const total = subtotal - state.discount + tax;

    setCalculator({
      ...state,
      subtotal,
      tax,
      total,
    });
  }, []);

  const addItem = useCallback(
    (item: CalculatorState["items"][0]) => {
      const newState = {
        ...calculator,
        items: [...calculator.items, item],
      };
      recalculate(newState);
    },
    [calculator, recalculate]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      const newState = {
        ...calculator,
        items: calculator.items.filter((i) => i.id !== itemId),
      };
      recalculate(newState);
    },
    [calculator, recalculate]
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      const newState = {
        ...calculator,
        items: calculator.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
      };
      recalculate(newState);
    },
    [calculator, recalculate]
  );

  const applyDiscount = useCallback(
    (amount: number) => {
      const newState = {
        ...calculator,
        discount: amount,
      };
      recalculate(newState);
    },
    [calculator, recalculate]
  );

  return {
    calculator,
    addItem,
    removeItem,
    updateQuantity,
    applyDiscount,
  };
}
