import { cashPrice, formatARS, installmentAmount } from "@/lib/formatters";
import { siteConfig } from "@/config/site";

interface CartSummaryProps {
  subtotal: number;
}

export function CartSummary({ subtotal }: CartSummaryProps) {
  const threshold = siteConfig.payments.freeShippingThreshold;
  const shippingFree = subtotal >= threshold;
  const remaining = Math.max(0, threshold - subtotal);
  const cash = cashPrice(subtotal);
  const per = installmentAmount(subtotal, siteConfig.payments.installments);

  return (
    <div className="space-y-3 py-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-soft">Subtotal</span>
        <span className="font-medium tabular-nums">{formatARS(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-soft">Envío</span>
        <span className="tabular-nums">
          {shippingFree ? (
            <span className="text-lavender-deep">Gratis ✨</span>
          ) : (
            "Se calcula en checkout"
          )}
        </span>
      </div>

      {!shippingFree && remaining > 0 && (
        <p className="rounded-[var(--radius-sm)] bg-lavender-soft/40 px-3 py-2 text-[12px] text-lavender-deep">
          Te faltan <span className="font-semibold">{formatARS(remaining)}</span> para envío
          gratis.
        </p>
      )}

      <div className="border-t border-ink/8 pt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-medium">Total</span>
          <span className="font-display text-2xl tabular-nums text-ink">
            {formatARS(subtotal)}
          </span>
        </div>
        <p className="mt-1 text-right text-[12px] text-ink-soft">
          o {siteConfig.payments.installments} cuotas sin interés de{" "}
          <span className="tabular-nums text-ink">{formatARS(per)}</span>
        </p>
        <p className="text-right text-[12px] text-lavender-deep">
          <span className="font-medium tabular-nums">{formatARS(cash)}</span> en efectivo
          <span className="text-muted"> ({siteConfig.payments.cashDiscountPercent}% off)</span>
        </p>
      </div>
    </div>
  );
}
