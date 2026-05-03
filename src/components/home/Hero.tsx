"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.05fr_1fr] md:gap-14 md:py-20 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col justify-center"
        >
          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-lavender-soft/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-lavender-deep">
            Nueva colección
          </span>
          <h1 className="text-balance font-display text-[2.6rem] leading-[1.04] text-ink md:text-[3.8rem] lg:text-[4.4rem]">
            Less is more.
            <br />
            <span className="text-lavender-deep italic">Dewy skin, always.</span>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Skincare y maquillaje de calidad cosmética. Autenticidad y bienestar al alcance
            de tu mano — con fórmulas livianas que realzan tu piel, no la tapan.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/productos"
              className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream-soft hover:bg-ink/85"
            >
              Comprar ahora
            </Link>
            <Link
              href="/productos?cat=skincare"
              className="inline-flex h-12 items-center justify-center rounded-full border border-ink/20 px-7 text-sm font-medium text-ink hover:border-ink/50"
            >
              Ver Skin Care
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-5 text-[12px] text-ink-soft">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-lavender" />
              Cruelty-free
            </span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-peach" />
              Fórmulas limpias
            </span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-gold" />
              Made in Argentina
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          className="relative"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-xl)] bg-peach-soft">
            <Image
              src="https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=1400&q=80"
              alt="Modelo con piel luminosa"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-4 -left-4 hidden md:block">
            <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-[var(--shadow-lift)]">
              <div className="flex size-9 items-center justify-center rounded-full bg-dew/50 text-gold">
                <Star className="size-4.5 fill-gold" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-ink-soft">Rating</p>
                <p className="font-display text-sm">4.9 · 1.2k reseñas</p>
              </div>
            </div>
          </div>
          <div className="absolute -top-4 right-4 hidden md:block">
            <div className="rounded-full bg-lavender px-5 py-2 text-[12px] font-medium uppercase tracking-wider text-white shadow-[var(--shadow-soft)]">
              3 cuotas sin interés
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
