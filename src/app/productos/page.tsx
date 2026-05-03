import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { CategorySidebar } from "@/components/product/CategorySidebar";
import {
  getTopLevelCategories,
  getCategory,
  getDescendantSlugs,
  getChildren,
  getCategoryPath,
} from "@/lib/data/categories";
import { products } from "@/lib/data/products";
import { cn } from "@/lib/utils";
import type { CategorySlug } from "@/types";

export const metadata: Metadata = {
  title: "Shop",
  description: "Explorá todos nuestros productos de make up, skin care y más.",
};

interface PageProps {
  searchParams: Promise<{ cat?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { cat } = await searchParams;
  const activeCat = cat ? getCategory(cat) : undefined;

  const filtered = activeCat
    ? products.filter((p) =>
        getDescendantSlugs(activeCat.slug).includes(p.category),
      )
    : products;

  const breadcrumb = activeCat ? getCategoryPath(activeCat.slug) : [];

  // Mobile contextual chips: children of active cat, or siblings if it's a leaf
  const directChildren = activeCat ? getChildren(activeCat.slug) : [];
  const mobileChips =
    directChildren.length > 0
      ? { parentSlug: activeCat!.slug, parentName: activeCat!.name, items: directChildren }
      : activeCat?.parent
        ? {
            parentSlug: activeCat.parent,
            parentName: getCategoryPath(activeCat.parent)[getCategoryPath(activeCat.parent).length - 1]?.name ?? "",
            items: getChildren(activeCat.parent as CategorySlug),
          }
        : { parentSlug: null, parentName: null, items: getTopLevelCategories() };

  return (
    <section className="container-page py-10 md:py-14">

      {/* Page header — full width */}
      <header className="mb-8">
        {breadcrumb.length > 0 && (
          <nav
            className="mb-4 flex items-center gap-1.5 text-[12px] text-ink-soft"
            aria-label="Breadcrumb"
          >
            <Link href="/productos" className="hover:text-ink transition-colors">
              Shop
            </Link>
            {breadcrumb.map((crumb) => (
              <span key={crumb.slug} className="flex items-center gap-1.5">
                <ChevronRight className="size-3 opacity-40" />
                <Link
                  href={`/productos?cat=${crumb.slug}`}
                  className={cn(
                    "transition-colors hover:text-ink",
                    crumb.slug === activeCat?.slug && "font-medium text-ink",
                  )}
                >
                  {crumb.name}
                </Link>
              </span>
            ))}
          </nav>
        )}

        <span className="text-[11px] uppercase tracking-[0.18em] text-lavender-deep">
          Shop
        </span>
        <h1 className="mt-1 font-display text-[2.2rem] leading-tight md:text-[3rem]">
          {activeCat ? activeCat.name : "Todos los productos"}
        </h1>

        {/* Mobile-only horizontal chip strip */}
        <div className="mt-5 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {mobileChips.parentSlug && (
              <Link
                href={`/productos?cat=${mobileChips.parentSlug}`}
                className="flex-shrink-0 rounded-full border border-ink/15 px-4 py-2 text-[13px] text-ink-soft hover:border-ink/40 transition-colors"
              >
                ← Todo
              </Link>
            )}
            {!mobileChips.parentSlug && (
              <Link
                href="/productos"
                className={cn(
                  "flex-shrink-0 rounded-full border px-4 py-2 text-[13px] transition-colors",
                  !activeCat
                    ? "border-ink bg-ink text-cream-soft"
                    : "border-ink/15 text-ink-soft hover:border-ink/40",
                )}
              >
                Todos
              </Link>
            )}
            {mobileChips.items.map((c) => (
              <Link
                key={c.slug}
                href={`/productos?cat=${c.slug}`}
                className={cn(
                  "flex-shrink-0 rounded-full border px-4 py-2 text-[13px] transition-colors",
                  activeCat?.slug === c.slug
                    ? "border-ink bg-ink text-cream-soft"
                    : "border-ink/15 text-ink-soft hover:border-ink/40",
                )}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Two-column layout on desktop */}
      <div className="flex gap-14">
        {/* Sidebar — desktop only */}
        <aside className="hidden w-[180px] flex-shrink-0 lg:block">
          <CategorySidebar activeCategorySlug={activeCat?.slug as CategorySlug | undefined} />
        </aside>

        {/* Product grid */}
        <div className="min-w-0 flex-1">
          <ProductGrid products={filtered} />
        </div>
      </div>
    </section>
  );
}
