"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, CreditCard } from "lucide-react";
import type { CartItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { buildOrderMessage, getWhatsAppUrl } from "@/lib/whatsapp";

interface CheckoutActionsProps {
  items: CartItem[];
  subtotal: number;
  onAfterWhatsApp?: () => void;
}

export function CheckoutActions({ items, subtotal, onAfterWhatsApp }: CheckoutActionsProps) {
  const router = useRouter();

  const handleWhatsApp = () => {
    const message = buildOrderMessage(items, subtotal);
    window.open(getWhatsAppUrl(message), "_blank", "noopener");
    onAfterWhatsApp?.();
  };

  const handleMP = () => {
    router.push("/checkout");
  };

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={handleMP} size="lg" disabled={items.length === 0}>
        <CreditCard className="size-4" />
        Pagar con Mercado Pago
      </Button>
      <Button
        onClick={handleWhatsApp}
        size="lg"
        variant="whatsapp"
        disabled={items.length === 0}
      >
        <MessageCircle className="size-4" />
        Finalizar por WhatsApp
      </Button>
      <p className="text-center text-[11px] text-ink-soft">
        Pago seguro. Tus datos están protegidos.
      </p>
    </div>
  );
}
