"use client";

import * as React from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export function Newsletter() {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubmitted(true);
    toast("¡Listo! Te enviamos tu código a tu email.");
  };

  return (
    <section className="container-page py-16 md:py-20">
      <div className="mx-auto max-w-2xl rounded-[var(--radius-xl)] bg-lavender-soft/40 px-8 py-12 text-center md:px-14 md:py-16">
        <span className="text-[11px] uppercase tracking-[0.18em] text-lavender-deep">
          Unite a la comunidad
        </span>
        <h3 className="mt-3 font-display text-[1.8rem] leading-tight text-ink md:text-[2.4rem]">
          Sumate y recibí{" "}
          <span className="italic text-gold">10% OFF</span> en tu primera compra
        </h3>
        <p className="mt-4 text-sm text-ink-soft">
          Novedades, lanzamientos y rutinas pensadas por nuestra comunidad. Sin spam.
        </p>

        {submitted ? (
          <p className="mt-6 rounded-full bg-white px-5 py-3 text-sm text-ink">
            ✨ Gracias por sumarte. Revisá tu mail.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <Input
              type="email"
              required
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/80"
            />
            <Button type="submit" size="md">
              Suscribirme
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
