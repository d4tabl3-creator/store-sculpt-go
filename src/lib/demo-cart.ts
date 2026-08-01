import { useSyncExternalStore } from "react";

export type DemoCartItem = {
  key: string;
  productId: number;
  variantId: number;
  title: string;
  variantLabel: string;
  image: string;
  priceCents: number;
  qty: number;
};

let items: DemoCartItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  items = [...items];
  listeners.forEach((l) => l());
}

export function addToDemoCart(item: Omit<DemoCartItem, "key" | "qty">, qty = 1) {
  const key = `${item.productId}-${item.variantId}`;
  const existing = items.find((i) => i.key === key);
  if (existing) existing.qty += qty;
  else items.push({ ...item, key, qty });
  emit();
}

export function setDemoQty(key: string, qty: number) {
  if (qty <= 0) items = items.filter((i) => i.key !== key);
  else items = items.map((i) => (i.key === key ? { ...i, qty } : i));
  emit();
}

export function clearDemoCart() {
  items = [];
  emit();
}

export function useDemoCart(): DemoCartItem[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
    () => items,
  );
}
