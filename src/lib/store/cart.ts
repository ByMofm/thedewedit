"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CartItem,
  Product,
  ProductVariant,
  ShippingQuoteResult,
  ShippingQuoteState,
} from "@/types";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  shipping: ShippingQuoteState;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setShippingLoading: (postalCode: string) => void;
  setShippingSuccess: (result: ShippingQuoteResult) => void;
  setShippingError: (postalCode: string, message: string, unavailable?: boolean) => void;
  selectShippingOption: (id: string) => void;
  clearShipping: () => void;
}

const sameLine = (a: CartItem, productId: string, variantId?: string) =>
  a.productId === productId && (a.variantId ?? null) === (variantId ?? null);

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      shipping: { status: "idle" },

      addItem: (product, variant, quantity = 1) =>
        set((state) => {
          const variantId = variant?.id;
          const existing = state.items.find((i) => sameLine(i, product.id, variantId));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, product.id, variantId)
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              ),
              isOpen: true,
            };
          }
          const price = variant?.price ?? product.price;
          const newItem: CartItem = {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price,
            image: product.images[0],
            quantity,
            variantId: variant?.id,
            variantName: variant?.name,
          };
          return { items: [...state.items, newItem], isOpen: true };
        }),

      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, productId, variantId)),
        })),

      updateQuantity: (productId, quantity, variantId) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => !sameLine(i, productId, variantId))
              : state.items.map((i) =>
                  sameLine(i, productId, variantId) ? { ...i, quantity } : i,
                ),
        })),

      clear: () => set({ items: [] }),
      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
      toggleDrawer: () => set((s) => ({ isOpen: !s.isOpen })),

      setShippingLoading: (postalCode) =>
        set({ shipping: { status: "loading", postalCode } }),

      setShippingSuccess: (result) =>
        set({
          shipping: {
            status: "success",
            result,
            selectedId: result.options[0]?.id ?? null,
          },
        }),

      setShippingError: (postalCode, message, unavailable) =>
        set({ shipping: { status: "error", postalCode, message, unavailable } }),

      selectShippingOption: (id) =>
        set((state) => {
          if (state.shipping.status !== "success") return {};
          return { shipping: { ...state.shipping, selectedId: id } };
        }),

      clearShipping: () => set({ shipping: { status: "idle" } }),
    }),
    {
      name: "tde-cart",
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export const selectSubtotal = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

export const selectItemCount = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0);

export const selectShippingCost = (state: CartState): number | null => {
  const { shipping } = state;
  if (shipping.status !== "success") return null;
  const { selectedId, result } = shipping;
  if (selectedId === null) return null;
  return result.options.find((o) => o.id === selectedId)?.price ?? null;
};
