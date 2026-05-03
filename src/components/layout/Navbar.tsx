"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import * as React from "react";
import { cn } from "@/lib/utils";
import { selectItemCount, useCart } from "@/lib/store/cart";
import { MobileMenu } from "./MobileMenu";
import { categories } from "@/lib/data/categories";

const makeupSections = categories
  .filter((c) => c.parent === "makeup")
  .map((section) => ({
    ...section,
    items: categories.filter((c) => c.parent === section.slug),
  }));

const mobileItems = [
  { href: "/productos", label: "Shop" },
  {
    href: "/productos?cat=makeup",
    label: "Make Up",
    children: [
      { href: "/productos?cat=makeup", label: "Todo Make Up" },
      ...makeupSections.map((s) => ({ href: `/productos?cat=${s.slug}`, label: s.name })),
    ],
  },
  { href: "/productos?cat=skincare", label: "Skin Care" },
  { href: "/productos?cat=brushes", label: "Brushes" },
  { href: "/productos?cat=accesorios", label: "Accesorios" },
];

const linkClass =
  "text-[13px] tracking-[0.08em] uppercase text-ink/75 hover:text-ink transition-colors";

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { itemCount, openDrawer } = useCart(
    useShallow((s) => ({
      itemCount: selectItemCount(s),
      openDrawer: s.openDrawer,
    })),
  );

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          scrolled
            ? "bg-cream-soft/85 backdrop-blur-md shadow-[var(--shadow-soft)]"
            : "bg-cream-soft",
        )}
      >
        <div className="container-page flex h-20 items-center justify-between gap-4 md:h-24">
          <button
            type="button"
            className="flex size-10 items-center justify-center -ml-2 rounded-full hover:bg-ink/5 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 md:flex-none"
            aria-label="The Dew Edit — Home"
          >
            <Image
              src="/assets/logo.jpeg"
              alt="The Dew Edit"
              width={96}
              height={96}
              className="size-14 rounded-full object-cover md:size-16"
              priority
            />
          </Link>

          <nav className="hidden md:flex md:items-center md:gap-7" aria-label="Principal">
            <Link href="/productos" className={linkClass}>
              Shop
            </Link>

            {/* Make Up — mega-menu */}
            <div className="group/makeup relative">
              <Link
                href="/productos?cat=makeup"
                className={cn(linkClass, "flex items-center gap-1")}
              >
                Make Up
                <ChevronDown className="size-3.5 transition-transform duration-200 group-hover/makeup:rotate-180" />
              </Link>

              {/* invisible bridge so moving mouse to dropdown doesn't close it */}
              <div className="invisible opacity-0 translate-y-1 pointer-events-none group-hover/makeup:visible group-hover/makeup:opacity-100 group-hover/makeup:translate-y-0 group-hover/makeup:pointer-events-auto absolute top-full left-0 pt-4 transition-all duration-200 z-50">
                <div className="rounded-[var(--radius-lg)] border border-ink/8 bg-cream-soft shadow-[var(--shadow-lift)] p-6">
                  <div className="grid grid-cols-4 gap-8 min-w-max">
                    {makeupSections.map((section) => (
                      <div key={section.slug}>
                        <Link
                          href={`/productos?cat=${section.slug}`}
                          className="mb-3 block text-[11px] uppercase tracking-[0.14em] font-semibold text-ink hover:text-lavender-deep transition-colors"
                        >
                          {section.name}
                        </Link>
                        <ul className="space-y-2.5">
                          {section.items.map((item) => (
                            <li key={item.slug}>
                              <Link
                                href={`/productos?cat=${item.slug}`}
                                className="text-[13px] text-ink-soft hover:text-ink transition-colors"
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Link href="/productos?cat=skincare" className={linkClass}>
              Skin Care
            </Link>
            <Link href="/productos?cat=brushes" className={linkClass}>
              Brushes
            </Link>
            <Link href="/productos?cat=accesorios" className={linkClass}>
              Accesorios
            </Link>
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full hover:bg-ink/5"
              aria-label="Buscar"
            >
              <Search className="size-4.5" />
            </button>
            <Link
              href="/checkout"
              className="hidden md:flex size-10 items-center justify-center rounded-full hover:bg-ink/5"
              aria-label="Mi cuenta"
            >
              <User className="size-4.5" />
            </Link>
            <button
              type="button"
              onClick={openDrawer}
              className="relative flex size-10 items-center justify-center rounded-full hover:bg-ink/5"
              aria-label={`Abrir carrito${itemCount ? ` (${itemCount} items)` : ""}`}
            >
              <ShoppingBag className="size-4.5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-lavender text-[10px] font-semibold text-white tabular-nums">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} items={mobileItems} />
    </>
  );
}
