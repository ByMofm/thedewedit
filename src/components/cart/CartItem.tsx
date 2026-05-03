"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import type { CartItem as CartItemT } from "@/types";
import { useCart } from "@/lib/store/cart";
import { formatARS } from "@/lib/formatters";

interface CartItemProps {
  item: CartItemT;
  onNavigate?: () => void;
  compact?: boolean;
}

export function CartItem({ item, onNavigate, compact = false }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex gap-4 py-4">
      <Link
        href={`/productos/${item.slug}`}
        onClick={onNavigate}
        className="relative block aspect-square w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-cream"
      >
        <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/productos/${item.slug}`}
              onClick={onNavigate}
              className="text-sm font-medium text-ink hover:text-lavender-deep"
            >
              {item.name}
            </Link>
            {item.variantName && (
              <p className="mt-0.5 text-[12px] text-ink-soft">{item.variantName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.productId, item.variantId)}
            className="-mt-1 flex size-7 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5 hover:text-ink"
            aria-label={`Remover ${item.name}`}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center rounded-full border border-ink/15">
            <button
              type="button"
              onClick={() =>
                updateQuantity(item.productId, item.quantity - 1, item.variantId)
              }
              className="flex size-8 items-center justify-center hover:bg-ink/5"
              aria-label="Restar"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-[1.75rem] text-center text-[13px] tabular-nums">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                updateQuantity(item.productId, item.quantity + 1, item.variantId)
              }
              className="flex size-8 items-center justify-center hover:bg-ink/5"
              aria-label="Sumar"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <span className="text-sm font-medium tabular-nums text-ink">
            {formatARS(item.price * item.quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}
