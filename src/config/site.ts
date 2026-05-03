export const siteConfig = {
  name: "The Dew Edit",
  tagline: "Skincare y calidad cosmética. Autenticidad y bienestar al alcance de tu mano.",
  description:
    "Tienda de maquillaje y skincare premium. Autenticidad y bienestar al alcance de tu mano. 3 cuotas sin interés · descuento en efectivo.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  currency: "ARS" as const,
  locale: "es-AR" as const,
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5491100000000",
  social: {
    instagram: "https://instagram.com/thedewedit.ar",
    instagramHandle: "@thedewedit.ar",
  },
  payments: {
    installments: 3,
    cashDiscountPercent: 16.67,
    freeShippingThreshold: 35000,
  },
  contact: {
    email: "hola@thedewedit.ar",
  },
};

export type SiteConfig = typeof siteConfig;
