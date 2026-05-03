"use client";

import Link from "next/link";
import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { useCart } from "@/lib/store/cart";

export default function CheckoutSuccessPage() {
  const clear = useCart((s) => s.clear);
  React.useEffect(() => {
    clear();
  }, [clear]);

  return (
    <section className="container-page flex min-h-[70vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-lavender-soft/50 text-lavender-deep">
        <CheckCircle2 className="size-8" />
      </div>
      <h1 className="font-display text-[2.2rem] md:text-[3rem]">¡Gracias por tu compra!</h1>
      <p className="max-w-md text-sm text-ink-soft">
        Recibimos tu pedido y te vamos a escribir por email con el detalle del envío.
        Mientras tanto, seguinos en Instagram para tips y novedades.
      </p>
      <Link
        href="/productos"
        className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream-soft hover:bg-ink/85"
      >
        Seguir comprando
      </Link>
    </section>
  );
}
