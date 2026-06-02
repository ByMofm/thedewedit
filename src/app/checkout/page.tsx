"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { Lock } from "lucide-react";
import { CartSummary } from "@/components/cart/CartSummary";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { selectShippingCost, selectSubtotal, useCart } from "@/lib/store/cart";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, shippingCost } = useCart(
    useShallow((s) => ({
      items: s.items,
      subtotal: selectSubtotal(s),
      shippingCost: selectShippingCost(s),
    })),
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (items.length === 0) router.replace("/carrito");
  }, [items.length, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payer = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, payer, shippingCost: shippingCost ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear la preferencia.");
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error("Respuesta inválida de Mercado Pago.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setLoading(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="container-page grid gap-10 py-10 md:grid-cols-[1.3fr_1fr] md:gap-14 md:py-14">
      <div>
        <h1 className="font-display text-[2rem] md:text-[2.6rem]">Checkout</h1>
        <p className="text-sm text-ink-soft">
          Completá tus datos y te redirigimos a Mercado Pago para finalizar.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <fieldset className="space-y-3">
            <legend className="mb-2 font-display text-lg">Contacto</legend>
            <Input name="name" placeholder="Nombre y apellido" required autoComplete="name" />
            <Input name="email" type="email" placeholder="Email" required autoComplete="email" />
            <Input name="phone" placeholder="Teléfono" required autoComplete="tel" />
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-2 font-display text-lg">Envío</legend>
            <Input name="address" placeholder="Dirección" required autoComplete="street-address" />
            <div className="grid grid-cols-2 gap-3">
              <Input name="city" placeholder="Ciudad" required autoComplete="address-level2" />
              <Input name="zip" placeholder="Código postal" required autoComplete="postal-code" />
            </div>
          </fieldset>

          {error && (
            <div className="rounded-[var(--radius-md)] border border-peach/40 bg-peach/10 px-4 py-3 text-sm text-ink">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            <Lock className="size-4" />
            {loading ? "Redirigiendo a MP..." : "Pagar con Mercado Pago"}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-soft">
            <Lock className="size-3" />
            Conexión segura. Tus datos están protegidos.
          </p>
        </form>
      </div>

      <aside className="h-fit rounded-[var(--radius-lg)] bg-white/70 p-6 md:sticky md:top-28">
        <h2 className="font-display text-xl">Tu pedido</h2>
        <ul className="mt-4 divide-y divide-ink/8 border-y border-ink/8">
          {items.map((item) => (
            <li
              key={`${item.productId}-${item.variantId ?? "-"}`}
              className="flex justify-between py-3 text-sm"
            >
              <span className="text-ink-soft">
                {item.quantity}× {item.name}
                {item.variantName ? ` (${item.variantName})` : ""}
              </span>
            </li>
          ))}
        </ul>
        <CartSummary subtotal={subtotal} shippingCost={shippingCost} />
      </aside>
    </section>
  );
}
