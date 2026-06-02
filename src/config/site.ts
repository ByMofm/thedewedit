export const siteConfig = {
  name: "The Dew Edit",
  tagline: "Skincare y calidad cosmética. Autenticidad y bienestar al alcance de tu mano.",
  description:
    "Tienda de maquillaje y skincare premium. Autenticidad y bienestar al alcance de tu mano. 3 cuotas sin interés · descuento en efectivo.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  currency: "ARS" as const,
  locale: "es-AR" as const,
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5493815456600",
  social: {
    instagram: "https://instagram.com/thedewedit.ar",
    instagramHandle: "@thedewedit.ar",
  },
  payments: {
    installments: 3,
    cashDiscountPercent: 16.67,
    freeShippingThreshold: 35000,
  },
  shipping: {
    defaultWeightKg: 0.5,
    quoteExpiryMs: 10 * 60 * 1000,
  },
  contact: {
    email: "hola@thedewedit.ar",
  },
};

export type SiteConfig = typeof siteConfig;
