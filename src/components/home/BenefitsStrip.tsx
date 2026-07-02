import { CreditCard, Sparkles, Truck, RefreshCcw } from "lucide-react";
import { siteConfig } from "@/config/site";
import { formatARS } from "@/lib/formatters";

const freeShippingThreshold = siteConfig.payments.freeShippingThreshold;

const benefits = [
  {
    icon: CreditCard,
    title: "3 cuotas sin interés",
    description: "Con tarjetas bancarizadas",
  },
  {
    icon: Sparkles,
    title: "20% OFF en efectivo",
    description: "Transferencia o depósito",
  },
  freeShippingThreshold > 0
    ? {
        icon: Truck,
        title: "Envío gratis",
        description: `En compras +${formatARS(freeShippingThreshold)}`,
      }
    : {
        icon: Truck,
        title: "Envíos a todo el país",
        description: "Con Andreani",
      },
  {
    icon: RefreshCcw,
    title: "Cambios sin vueltas",
    description: "Dentro de los 15 días",
  },
];

export function BenefitsStrip() {
  return (
    <section className="border-y border-ink/5 bg-cream-soft">
      <div className="container-page grid gap-4 py-7 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-lavender-soft/50 text-lavender-deep">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">{title}</p>
              <p className="text-[12px] text-ink-soft">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
