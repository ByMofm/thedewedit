import { siteConfig } from "@/config/site";

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatARS(amount: number): string {
  return arsFormatter.format(Math.round(amount));
}

export function cashPrice(amount: number): number {
  const discount = siteConfig.payments.cashDiscountPercent / 100;
  return amount * (1 - discount);
}

export function installmentAmount(
  amount: number,
  installments = siteConfig.payments.installments,
): number {
  return amount / installments;
}

export function percentOff(price: number, compareAt: number): number {
  if (compareAt <= 0 || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
