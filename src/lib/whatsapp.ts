import { siteConfig } from "@/config/site";
import type { CartItem } from "@/types";
import { formatARS } from "./formatters";

export function buildOrderMessage(items: CartItem[], subtotal: number): string {
  const header = `¡Hola! Quisiera hacer este pedido en ${siteConfig.name}:`;

  const lines = items.map((item) => {
    const variant = item.variantName ? ` (${item.variantName})` : "";
    return `• ${item.quantity}× ${item.name}${variant} — ${formatARS(item.price * item.quantity)}`;
  });

  const total = `*Total:* ${formatARS(subtotal)}`;
  const footer = "¿Me confirmás disponibilidad y forma de pago? ¡Gracias!";

  return [header, "", ...lines, "", total, "", footer].join("\n");
}

export function getWhatsAppUrl(message: string): string {
  const number = siteConfig.whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
