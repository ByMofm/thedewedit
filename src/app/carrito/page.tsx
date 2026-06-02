"use client";

import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { ShoppingBag } from "lucide-react";
import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { CheckoutActions } from "@/components/cart/CheckoutActions";
import { ShippingCalculator } from "@/components/cart/ShippingCalculator";
import { selectShippingCost, selectSubtotal, useCart } from "@/lib/store/cart";

export default function CartPage() {
  const { items, subtotal, shippingCost, shippingLabel } = useCart(
    useShallow((s) => {
      const shippingState = s.shipping;
      const selectedId =
        shippingState.status === "success" ? shippingState.selectedId : null;
      const selectedOption =
        shippingState.status === "success" && selectedId
          ? shippingState.result.options.find((o) => o.id === selectedId)
          : null;

      return {
        items: s.items,
        subtotal: selectSubtotal(s),
        shippingCost: selectShippingCost(s),
        shippingLabel: selectedOption?.name ?? null,
      };
    }),
  );

  if (items.length === 0) {
    return (
      <section className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-lavender-soft/40">
          <ShoppingBag className="size-6 text-lavender-deep" />
        </div>
        <h1 className="font-display text-[2rem]">Tu carrito está vacío</h1>
        <p className="max-w-md text-sm text-ink-soft">
          Descubrí los favoritos de la comunidad y empezá a armar tu rutina.
        </p>
        <Link
          href="/productos"
          className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream-soft hover:bg-ink/85"
        >
          Ir al shop
        </Link>
      </section>
    );
  }

  return (
    <section className="container-page grid gap-10 py-10 md:grid-cols-[1.3fr_1fr] md:gap-14 md:py-14">
      <div>
        <h1 className="font-display text-[2rem] md:text-[2.6rem]">Tu carrito</h1>
        <p className="text-sm text-ink-soft">
          {items.reduce((s, i) => s + i.quantity, 0)} productos
        </p>
        <div className="mt-6 divide-y divide-ink/8 border-y border-ink/8">
          {items.map((item) => (
            <CartItem
              key={`${item.productId}-${item.variantId ?? "-"}`}
              item={item}
            />
          ))}
        </div>
      </div>

      <aside className="h-fit rounded-[var(--radius-lg)] bg-white/70 p-6 md:sticky md:top-28">
        <h2 className="font-display text-xl">Resumen</h2>
        <ShippingCalculator subtotal={subtotal} />
        <CartSummary subtotal={subtotal} shippingCost={shippingCost} />
        <CheckoutActions
          items={items}
          subtotal={subtotal}
          shippingCost={shippingCost}
          shippingLabel={shippingLabel}
        />
      </aside>
    </section>
  );
}
