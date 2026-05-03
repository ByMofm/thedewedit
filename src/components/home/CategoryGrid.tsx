"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { getTopLevelCategories } from "@/lib/data/categories";

export function CategoryGrid() {
  const topCategories = getTopLevelCategories().filter((c) => !!c.image);

  return (
    <section className="container-page py-16 md:py-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.18em] text-lavender-deep">
            Categorías
          </span>
          <h2 className="mt-2 font-display text-[2rem] leading-tight text-ink md:text-[2.6rem]">
            Explorá el universo Dew
          </h2>
        </div>
        <Link
          href="/productos"
          className="text-sm tracking-wide text-ink-soft hover:text-ink underline underline-offset-4"
        >
          Ver todos los productos
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {topCategories.map((category, idx) => (
          <motion.div
            key={category.slug}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, ease: "easeOut", delay: idx * 0.06 }}
          >
            <Link
              href={`/productos?cat=${category.slug}`}
              className="group relative block overflow-hidden rounded-[var(--radius-lg)] bg-cream"
            >
              <div className="relative aspect-[3/4]">
                <Image
                  src={category.image!}
                  alt={category.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <h3 className="font-display text-xl">{category.name}</h3>
                  <p className="mt-1 text-[12px] opacity-90">{category.description}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
