import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFeatured } from "@/lib/data/products";
import { ProductCard } from "@/components/product/ProductCard";

export function FeaturedProducts() {
  const products = getFeatured();
  return (
    <section className="container-page py-16 md:py-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.18em] text-lavender-deep">
            Best sellers
          </span>
          <h2 className="mt-2 font-display text-[2rem] leading-tight text-ink md:text-[2.6rem]">
            Los favoritos del momento
          </h2>
        </div>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-sm tracking-wide text-ink hover:text-lavender-deep"
        >
          Ver todo <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
