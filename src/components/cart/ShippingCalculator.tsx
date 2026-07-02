"use client";

import * as React from "react";
import { MapPin } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useCart } from "@/lib/store/cart";
import { siteConfig } from "@/config/site";
import { formatARS } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import type { ShippingOption, ShippingQuoteResult } from "@/types";

interface ShippingCalculatorProps {
  subtotal: number;
  compact?: boolean;
}

interface OptionCardProps {
  option: ShippingOption;
  selected: boolean;
  onSelect: () => void;
  compact: boolean;
}

function OptionCard({ option, selected, onSelect, compact }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[var(--radius-md)] border text-left transition-colors",
        compact ? "px-3 py-2" : "px-3.5 py-2.5",
        selected
          ? "border-lavender-deep bg-lavender-soft/30"
          : "border-ink/15 bg-white/60 hover:border-ink/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-3.5 shrink-0 rounded-full border-2",
              selected ? "border-lavender-deep bg-lavender-deep" : "border-ink/30",
            )}
          />
          <div>
            <p className="text-[12px] font-medium text-ink">
              {option.type === "domicilio" ? "Envío a domicilio" : "Retiro en sucursal"}
            </p>
            <p className="text-[11px] text-ink-soft">
              {option.diasHabiles > 0
                ? `${option.diasHabiles} días hábiles`
                : `Andreani ${option.name}`}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
          {formatARS(option.price)}
        </span>
      </div>
    </button>
  );
}

export function ShippingCalculator({ subtotal, compact = false }: ShippingCalculatorProps) {
  const threshold = siteConfig.payments.freeShippingThreshold;

  const { shipping, setShippingLoading, setShippingSuccess, setShippingError, selectOption, clearShipping } =
    useCart(
      useShallow((s) => ({
        shipping: s.shipping,
        setShippingLoading: s.setShippingLoading,
        setShippingSuccess: s.setShippingSuccess,
        setShippingError: s.setShippingError,
        selectOption: s.selectShippingOption,
        clearShipping: s.clearShipping,
      })),
    );

  const [inputValue, setInputValue] = React.useState(() => {
    if (shipping.status === "loading" || shipping.status === "error") return shipping.postalCode;
    if (shipping.status === "success") return shipping.result.postalCode;
    return "";
  });
  const [inputError, setInputError] = React.useState<string | null>(null);

  // Expire stale quotes on mount
  React.useEffect(() => {
    if (
      shipping.status === "success" &&
      Date.now() - shipping.result.fetchedAt > siteConfig.shipping.quoteExpiryMs
    ) {
      clearShipping();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch when store transitions to "loading"
  React.useEffect(() => {
    if (shipping.status !== "loading") return;
    const cp = shipping.postalCode;
    let cancelled = false;

    fetch(`/api/shipping/quote?cp=${encodeURIComponent(cp)}&valor=${Math.round(subtotal)}`)
      .then(async (res) => {
        if (cancelled) return;
        const data = (await res.json()) as {
          options?: ShippingOption[];
          error?: string;
          unavailable?: boolean;
        };
        if (cancelled) return;
        if (!res.ok) {
          setShippingError(cp, data.error ?? "Error al cotizar.", data.unavailable);
          return;
        }
        const result: ShippingQuoteResult = {
          postalCode: cp,
          options: data.options ?? [],
          fetchedAt: Date.now(),
        };
        setShippingSuccess(result);
      })
      .catch(() => {
        if (cancelled) return;
        setShippingError(cp, "Error de conexión. Intentá de nuevo.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipping.status]);

  if (subtotal >= threshold) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cp = inputValue.trim();
    if (!/^\d{4}$/.test(cp)) {
      setInputError("Ingresá un código postal válido (4 dígitos).");
      return;
    }
    setInputError(null);
    setShippingLoading(cp);
  };

  const handleClear = () => {
    clearShipping();
    setInputValue("");
    setInputError(null);
  };

  if (shipping.status === "success") {
    return (
      <div className="pb-2 pt-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-ink-soft">
            <MapPin className="size-3.5" />
            CP {shipping.result.postalCode}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-lavender-deep underline underline-offset-2 hover:text-lavender"
          >
            Cambiar
          </button>
        </div>
        <div className="space-y-1.5">
          {shipping.result.options.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              selected={shipping.selectedId === option.id}
              onSelect={() => selectOption(option.id)}
              compact={compact}
            />
          ))}
        </div>
      </div>
    );
  }

  const isLoading = shipping.status === "loading";

  return (
    <div className="pb-2 pt-1">
      <p className="mb-1.5 text-[12px] text-ink-soft">Calcular envío</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="Código postal"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setInputError(null);
          }}
          disabled={isLoading}
          className="h-9 flex-1 rounded-full text-sm"
          aria-label="Código postal para calcular envío"
        />
        <button
          type="submit"
          disabled={isLoading || inputValue.trim().length === 0}
          className="h-9 shrink-0 rounded-full bg-ink px-4 text-[13px] font-medium text-cream-soft transition-colors hover:bg-ink/85 disabled:opacity-40"
        >
          {isLoading ? "..." : "Calcular"}
        </button>
      </form>
      {inputError && <p className="mt-1.5 text-[12px] text-red-500">{inputError}</p>}
      {shipping.status === "error" && (
        <div className="mt-2 rounded-[var(--radius-sm)] border border-peach/40 bg-peach/10 px-3 py-2 text-[12px] text-ink">
          {shipping.message}
        </div>
      )}
    </div>
  );
}
