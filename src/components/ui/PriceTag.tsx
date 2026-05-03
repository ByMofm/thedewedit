import { cn } from "@/lib/utils";
import { cashPrice, formatARS, installmentAmount } from "@/lib/formatters";
import { siteConfig } from "@/config/site";

interface PriceTagProps {
  price: number;
  compareAtPrice?: number;
  size?: "sm" | "md" | "lg";
  showInstallments?: boolean;
  showCash?: boolean;
  className?: string;
}

export function PriceTag({
  price,
  compareAtPrice,
  size = "md",
  showInstallments = true,
  showCash = false,
  className,
}: PriceTagProps) {
  if (price === 0) return null;

  const hasDiscount = compareAtPrice != null && compareAtPrice > price;
  const installments = siteConfig.payments.installments;
  const perInstallment = installmentAmount(price, installments);
  const cash = cashPrice(price);

  const priceSize = {
    sm: "text-xl",
    md: "text-[26px]",
    lg: "text-[36px]",
  }[size];

  const compareSize = {
    sm: "text-sm",
    md: "text-[15px]",
    lg: "text-lg",
  }[size];

  const installmentSize = {
    sm: "text-[11px]",
    md: "text-[12px]",
    lg: "text-[13px]",
  }[size];

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Tier 1 — precio principal: anchor dominante */}
      <span className={cn("font-bold tabular-nums text-ink leading-none", priceSize)}>
        {formatARS(price)}
      </span>

      {/* Tier 2 — precio anterior: claramente secundario */}
      {hasDiscount && (
        <span className={cn("mt-1 tabular-nums text-muted line-through leading-none", compareSize)}>
          {formatARS(compareAtPrice!)}
        </span>
      )}

      {/* Tier 3 — cuotas: beneficio complementario */}
      {showInstallments && (
        <p className={cn("mt-2 leading-none text-ink-soft", installmentSize)}>
          {installments}
          <span className="mx-0.5">×</span>
          <span className="font-semibold text-ink tabular-nums">
            {formatARS(perInstallment)}
          </span>{" "}
          sin interés
        </p>
      )}

      {/* Tier 4 — efectivo: solo en PDP */}
      {showCash && (
        <p className={cn("mt-1 leading-none text-lavender-deep", installmentSize)}>
          <span className="font-semibold tabular-nums">{formatARS(cash)}</span>{" "}
          <span className="font-normal opacity-75">en efectivo</span>
        </p>
      )}
    </div>
  );
}
