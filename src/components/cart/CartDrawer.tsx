"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { selectSubtotal, useCart } from "@/lib/store/cart";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import { CheckoutActions } from "./CheckoutActions";

export function CartDrawer() {
  const { items, subtotal, isOpen, closeDrawer } = useCart(
    useShallow((s) => ({
      items: s.items,
      subtotal: selectSubtotal(s),
      isOpen: s.isOpen,
      closeDrawer: s.closeDrawer,
    })),
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Cerrar carrito"
            onClick={closeDrawer}
            className="fixed inset-0 z-50 bg-ink/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            role="dialog"
            aria-label="Carrito"
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-cream-soft sm:w-[420px]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 280 }}
          >
            <header className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4" />
                <h2 className="font-display text-lg">Tu carrito</h2>
                {items.length > 0 && (
                  <span className="rounded-full bg-ink/8 px-2 py-0.5 text-[11px] font-medium">
                    {items.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="flex size-9 items-center justify-center rounded-full hover:bg-ink/5"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-lavender-soft/40">
                  <ShoppingBag className="size-6 text-lavender-deep" />
                </div>
                <p className="font-display text-xl">Tu carrito está vacío</p>
                <p className="max-w-xs text-sm text-ink-soft">
                  Descubrí los favoritos de la comunidad y empezá a armar tu rutina.
                </p>
                <Link
                  href="/productos"
                  onClick={closeDrawer}
                  className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream-soft hover:bg-ink/85"
                >
                  Explorar productos
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 divide-y divide-ink/8">
                  {items.map((item) => (
                    <CartItem
                      key={`${item.productId}-${item.variantId ?? "-"}`}
                      item={item}
                      onNavigate={closeDrawer}
                    />
                  ))}
                </div>
                <footer className="border-t border-ink/8 bg-white/60 px-5 pb-5">
                  <CartSummary subtotal={subtotal} />
                  <CheckoutActions
                    items={items}
                    subtotal={subtotal}
                    onAfterWhatsApp={closeDrawer}
                  />
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
