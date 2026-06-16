# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm 10.30.3** (pinned via `packageManager`). Use `pnpm`, not `npm`/`yarn`.

- `pnpm dev` — Next.js dev server with Turbopack.
- `pnpm build` — production build.
- `pnpm start` — serve the production build.
- `pnpm lint` — `next lint`. There is no test runner configured.
- `pnpm stock:sync` — regenera `src/lib/data/stock.ts` desde `data/stock.csv` (ver "Stock management" abajo).

Copy `.env.local.example` to `.env.local` before running. Required vars: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `MP_ACCESS_TOKEN`, `NEXT_PUBLIC_MP_PUBLIC_KEY`. Without `MP_ACCESS_TOKEN`, `POST /api/mercadopago/preference` throws at request time (see `src/lib/mercadopago.ts:7`).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS **v4** · Zustand · Framer Motion · Mercado Pago SDK. Path alias `@/*` → `src/*`.

## Architecture

**Product catalog is static.** Products and categories live as hand-written arrays in `src/lib/data/products.ts` and `src/lib/data/categories.ts` — there is no database, CMS, or API. `/productos/[slug]` uses `generateStaticParams` to prerender every product slug. When adding products, add them to this array; when filtering/fetching, use the `getProduct`/`getFeatured`/`getByCategory`/`getRelated` helpers rather than re-implementing lookups.

**Stock management.** El stock NO vive en `products.ts`. La fuente única es **Google Sheets** (pestaña/planilla "Stock" con columnas `productId, variantId, stock`); el modo local de fallback usa `data/stock.csv` (header `productId,stock,variant`). Ambos son consumidos por `scripts/sync-sheets.mjs` (corre en `prebuild` y con `pnpm stock:sync`/`pnpm sheets:sync`), que **genera** `src/lib/data/stock.ts` (y `src/lib/data/products-raw.ts` en modo Sheets) — esos archivos no se editan a mano. Los helpers de `products.ts` aplican `applyStock` al vuelo: para productos con variantes, `product.stock` es la suma de los stocks de todas las variantes. El script avisa con WARN cualquier desalineamiento. Para evitar sobreventa, `/api/mercadopago/preference` re-valida el stock **en vivo** contra el Sheet vía `src/lib/stock-live.ts` (`checkCartStock`) antes de crear la preferencia (409 si falta), y el Apps Script de órdenes (`scripts/apps-script-orders.gs`) **descuenta** el stock vendido al aprobarse el pago y dispara un redeploy (`/api/publish`). El `stockMap` estático del build sirve para mostrar el catálogo rápido; la verdad transaccional es la lectura en vivo.

**Cart is a client-only Zustand store** at `src/lib/store/cart.ts`, persisted to `localStorage` under the key `tde-cart` (only `items` is partialize'd — `isOpen` is intentionally not persisted). Cart lines are uniquely identified by `(productId, variantId)` via the `sameLine` helper, not by `productId` alone — preserve this when changing add/update/remove logic. Components reading multiple cart fields should use `useShallow` (see `src/app/checkout/page.tsx:14`) to avoid re-render storms. Derived values are exposed as selectors: `selectSubtotal`, `selectItemCount`.

**Checkout has two parallel paths** and both must keep working:
1. **Mercado Pago Checkout Pro** — `src/app/checkout/page.tsx` POSTs `{ items, payer }` to `/api/mercadopago/preference` (`src/app/api/mercadopago/preference/route.ts`), which calls `createPreference` in `src/lib/mercadopago.ts` and returns `{ id, init_point, sandbox_init_point }`. The client redirects to `init_point`. `back_urls` and `notification_url` are built from `siteConfig.url`, so `NEXT_PUBLIC_SITE_URL` must be reachable by MP in non-local environments. The webhook at `src/app/api/mercadopago/webhook/route.ts` está **implementado**: verifica la firma (`MP_WEBHOOK_SECRET`), trae el pago real con `getPayment`, y en pagos `approved` lo persiste vía `forwardOrderToSheets` (`src/lib/orders.ts`) al Apps Script de órdenes — que además descuenta stock y republica.
2. **WhatsApp fallback** — `src/lib/whatsapp.ts` builds a pre-filled order message and a `wa.me` URL using `siteConfig.whatsappNumber`. Used from the cart drawer / cart page as the "checkout without card" option.

**Pricing rules are centralized** in `src/config/site.ts` (`siteConfig.payments`: `installments: 3`, `cashDiscountPercent: 20`, `freeShippingThreshold: 35000`) and applied via `src/lib/formatters.ts` (`formatARS`, `cashPrice`, `installmentAmount`, `percentOff`). Change the config, not ad-hoc math in components. Locale is `es-AR`, currency `ARS`, and all user-facing strings are in Spanish — keep them that way.

**Design system is Tailwind v4 `@theme inline`**, not `tailwind.config.js`. Tokens (cream/gold/peach/lavender/dew/ink palette, radii, shadows, font CSS vars) are declared in `src/app/globals.css`. Fonts (`Fraunces` display, `Inter` sans) are loaded via `next/font/google` in `src/app/layout.tsx` and exposed as `--font-fraunces` / `--font-inter`. Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) to compose class names.

**Root layout mounts global singletons** — `AnnouncementBar`, `Navbar`, `Footer`, `CartDrawer`, `ToastHost` — in `src/app/layout.tsx`. `ToastHost` uses a module-scoped callback pattern: call `toast("…")` from anywhere (`src/components/ui/Toast.tsx:11`) and the host renders it. Do not mount a second `ToastHost`.

**Server vs. client boundaries:** product listing / detail pages are server components and use the data helpers directly. Anything touching `useCart` (cart drawer, cart/checkout pages, "add to cart" buttons) is `"use client"`. Keep MP access-token code server-side only — it's in `src/lib/mercadopago.ts` and imported solely from the API route.

**Remote images** are only allowed from `images.unsplash.com` and `cdn.shopify.com` (`next.config.ts`). Add new hosts there before using `next/image` with external URLs.

## Route map

- `/` — home (`src/app/page.tsx`, composes `components/home/*`).
- `/productos` — catalog grid.
- `/productos/[slug]` — product detail + related (statically generated).
- `/carrito` — full cart page.
- `/checkout` — payer form → MP preference.
- `/checkout/success` — MP back URL for approved/pending.
- `/api/mercadopago/preference` (POST) — creates MP preference.
- `/api/mercadopago/webhook` (POST/GET) — stub webhook.
