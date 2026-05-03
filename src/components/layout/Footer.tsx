import Image from "next/image";
import Link from "next/link";
import { Heart, Instagram, Mail, MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getWhatsAppUrl } from "@/lib/whatsapp";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/productos", label: "Ver todo" },
      { href: "/productos?cat=makeup", label: "Make Up" },
      { href: "/productos?cat=skincare", label: "Skin Care" },
      { href: "/productos?cat=brushes", label: "Brushes" },
      { href: "/productos?cat=accesorios", label: "Accesorios" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { href: "/envios", label: "Envíos" },
      { href: "/cambios", label: "Cambios y devoluciones" },
      { href: "/formas-de-pago", label: "Formas de pago" },
      { href: "/faq", label: "Preguntas frecuentes" },
    ],
  },
  {
    title: "Marca",
    links: [
      { href: "/sobre-nosotros", label: "Sobre nosotros" },
      { href: "/contacto", label: "Contacto" },
    ],
  },
];

export function Footer() {
  const wappUrl = getWhatsAppUrl("¡Hola! Tengo una consulta.");
  return (
    <footer className="mt-24 bg-cream-deep/70 text-ink">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.3fr_2fr] md:gap-16">
        <div>
          <Image
            src="/assets/logo.jpeg"
            alt="The Dew Edit"
            width={72}
            height={72}
            className="size-16 rounded-full object-cover"
          />
          <p className="mt-5 max-w-xs text-sm text-ink-soft">
            {siteConfig.tagline}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener"
              className="flex size-10 items-center justify-center rounded-full bg-white hover:bg-white/80"
              aria-label="Instagram"
            >
              <Instagram className="size-4" />
            </a>
            <a
              href={wappUrl}
              target="_blank"
              rel="noopener"
              className="flex size-10 items-center justify-center rounded-full bg-white hover:bg-white/80"
              aria-label="WhatsApp"
            >
              <MessageCircle className="size-4" />
            </a>
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="flex size-10 items-center justify-center rounded-full bg-white hover:bg-white/80"
              aria-label="Email"
            >
              <Mail className="size-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-[15px] text-ink">{col.title}</h4>
              <ul className="mt-4 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-ink-soft hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-ink/10">
        <div className="container-page flex flex-col gap-3 py-5 text-[12px] text-ink-soft md:flex-row md:items-center md:justify-between">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.
            </span>
            <span className="inline-flex items-center gap-1.5">
              · Creado con
              <Heart className="size-3.5 fill-peach text-peach" aria-label="amor" />
              por
              <a
                href="https://github.com/ByMofm"
                target="_blank"
                rel="noopener"
                className="font-medium text-ink hover:text-lavender-deep underline underline-offset-2"
              >
                ByMofm
              </a>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
