import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getTopLevelCategories,
  getChildren,
  getCategoryPath,
} from "@/lib/data/categories";
import type { CategorySlug } from "@/types";

interface CategorySidebarProps {
  activeCategorySlug?: CategorySlug;
}

export function CategorySidebar({ activeCategorySlug }: CategorySidebarProps) {
  const activePath = activeCategorySlug
    ? getCategoryPath(activeCategorySlug).map((c) => c.slug)
    : [];

  const topLevel = getTopLevelCategories();

  return (
    <nav aria-label="Categorías">
      <Link
        href="/productos"
        className={cn(
          "mb-5 block text-[13px] transition-colors",
          !activeCategorySlug
            ? "font-medium text-ink"
            : "text-ink-soft hover:text-ink",
        )}
      >
        Ver todo
      </Link>

      <div className="space-y-1">
        {topLevel.map((cat, idx) => {
          const isTopInPath = activePath[0] === cat.slug;
          const level2 = getChildren(cat.slug);

          return (
            <div key={cat.slug}>
              {idx > 0 && <div className="my-3 border-t border-ink/8" />}

              <Link
                href={`/productos?cat=${cat.slug}`}
                className={cn(
                  "block py-1 text-[11px] uppercase tracking-[0.13em] transition-colors",
                  isTopInPath
                    ? "font-semibold text-ink"
                    : "text-ink-soft hover:text-ink",
                )}
              >
                {cat.name}
              </Link>

              {isTopInPath && level2.length > 0 && (
                <div className="ml-2 mt-2 space-y-0.5">
                  {level2.map((child) => {
                    const isChildInPath = activePath.includes(child.slug);
                    const level3 = getChildren(child.slug);

                    return (
                      <div key={child.slug}>
                        <Link
                          href={`/productos?cat=${child.slug}`}
                          className={cn(
                            "block py-1.5 text-[13px] transition-colors",
                            isChildInPath
                              ? "font-medium text-ink"
                              : "text-ink-soft hover:text-ink",
                          )}
                        >
                          {child.name}
                        </Link>

                        {isChildInPath && level3.length > 0 && (
                          <div className="mb-1 ml-3 border-l border-ink/10 pl-3">
                            {level3.map((gc) => {
                              const isActive = activeCategorySlug === gc.slug;
                              return (
                                <Link
                                  key={gc.slug}
                                  href={`/productos?cat=${gc.slug}`}
                                  className={cn(
                                    "flex items-center gap-2 py-1 text-[12px] transition-colors",
                                    isActive
                                      ? "font-medium text-lavender-deep"
                                      : "text-ink-soft hover:text-ink",
                                  )}
                                >
                                  {isActive && (
                                    <span className="size-1.5 flex-shrink-0 rounded-full bg-lavender-deep" />
                                  )}
                                  {gc.name}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
