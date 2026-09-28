import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from './types';
import { DELIVERY_FEE, FREE_DELIVERY_ABOVE } from '../constants/theme';

export type CartLine = {
  product: Product;
  quantity: number;
};

type CartState = {
  lines: Record<string, CartLine>;
  add: (product: Product, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: {},
      add: (product, qty = 1) =>
        set((state) => {
          const existing = state.lines[product.id];
          const nextQty = (existing?.quantity ?? 0) + qty;
          return {
            lines: { ...state.lines, [product.id]: { product, quantity: nextQty } },
          };
        }),
      setQty: (productId, qty) =>
        set((state) => {
          if (qty <= 0) {
            const next = { ...state.lines };
            delete next[productId];
            return { lines: next };
          }
          const existing = state.lines[productId];
          if (!existing) return state;
          return {
            lines: { ...state.lines, [productId]: { ...existing, quantity: qty } },
          };
        }),
      remove: (productId) =>
        set((state) => {
          const next = { ...state.lines };
          delete next[productId];
          return { lines: next };
        }),
      clear: () => set({ lines: {} }),
    }),
    {
      name: 'medigo-cart',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// --- Derived selectors (pure helpers, used by screens) ---

export function cartLines(state: CartState): CartLine[] {
  return Object.values(state.lines);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.quantity, 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
}

export function cartDeliveryFee(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
}

export function cartNeedsPrescription(lines: CartLine[]): boolean {
  return lines.some((l) => l.product.prescription_required);
}
