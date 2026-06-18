import crypto from "node:crypto";
import { appendRows, readTab, updateCell } from "@/lib/sheets";

export interface OrderRecord {
  paymentId: string;
  preferenceId: string | null;
  status: string;
  statusDetail: string | null;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  installments: number | null;
  payerEmail: string | null;
  payerName: string | null;
  payerPhone: string | null;
  shippingAddress: string | null;
  shippingZip: string | null;
  items: Array<{ id: string; title: string; quantity: number; unitPrice: number }>;
  createdAt: string;
  approvedAt: string | null;
}

export function verifyMpSignature(params: {
  signatureHeader: string | null;
  requestIdHeader: string | null;
  dataId: string;
  secret: string;
}): boolean {
  const { signatureHeader, requestIdHeader, dataId, secret } = params;
  if (!signatureHeader || !requestIdHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

const ORDERS_TAB = "Órdenes";
const ORDER_COLS = [
  "paymentId", "createdAt", "approvedAt", "status", "statusDetail", "amount",
  "currency", "paymentMethod", "installments", "payerEmail", "payerName",
  "payerPhone", "shippingAddress", "shippingZip", "items", "preferenceId",
] as const;

export interface PersistResult {
  ok: boolean;
  reason?: string;
  duplicate?: boolean;
  /** SKUs vendidos por encima del stock disponible (para revisar/refund). */
  oversold?: string[];
}

/**
 * Registra la orden en la pestaña "Órdenes" y DESCUENTA el stock vendido, todo
 * server-side vía service account. Idempotente por paymentId: si ya está
 * registrado, no vuelve a appendear ni a descontar.
 *
 * ponytail: sin lock entre webhooks concurrentes (lee-modifica-escribe el stock).
 * A este volumen es improbable que choquen; el prechequeo en vivo de
 * /api/mercadopago/preference ya reduce sobreventa. Subir a re-read+retry o un
 * lock si el tráfico crece.
 */
export async function persistOrder(order: OrderRecord): Promise<PersistResult> {
  if (!process.env.SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    return { ok: false, reason: "no_config" };
  }

  // Idempotencia.
  const orders = await readTab(ORDERS_TAB);
  if (orders.rows.some((r) => r.paymentId === order.paymentId)) {
    return { ok: true, duplicate: true };
  }

  const itemsStr = order.items.map((it) => `${it.quantity}x ${it.title} ($${it.unitPrice})`).join(" | ");
  const row: (string | number)[] = [
    order.paymentId, order.createdAt, order.approvedAt ?? "", order.status, order.statusDetail ?? "",
    order.amount, order.currency, order.paymentMethod ?? "", order.installments ?? "",
    order.payerEmail ?? "", order.payerName ?? "", order.payerPhone ?? "",
    order.shippingAddress ?? "", order.shippingZip ?? "", itemsStr, order.preferenceId ?? "",
  ];
  // Append PRIMERO (marca de idempotencia). Si el descuento falla luego, un
  // reintento de MP se deduplica → preferimos descontar de menos que de más.
  await appendRows(ORDERS_TAB, orders.header.length === 0 ? [[...ORDER_COLS], row] : [row]);

  const oversold = await decrementStock(order.items);
  return { ok: true, oversold };
}

/** Descuenta unidades vendidas del Sheet. item.id = "productId" o "productId::variantId". */
async function decrementStock(items: OrderRecord["items"]): Promise<string[]> {
  const [productos, variantes] = await Promise.all([readTab("Productos"), readTab("Variantes")]);
  const pStockCol = productos.header.indexOf("stock");
  const vStockCol = variantes.header.indexOf("stock");

  type Loc = { tab: string; rowNumber: number; col: number; current: number };
  const loc = new Map<string, Loc>();
  if (pStockCol >= 0) {
    productos.rows.forEach((r, i) => {
      loc.set(r.productId, { tab: "Productos", rowNumber: productos.rowNumbers[i], col: pStockCol, current: Number(r.stock) || 0 });
    });
  }
  if (vStockCol >= 0) {
    variantes.rows.forEach((r, i) => {
      if (r.productId && r.variantId) {
        loc.set(`${r.productId}::${r.variantId}`, { tab: "Variantes", rowNumber: variantes.rowNumbers[i], col: vStockCol, current: Number(r.stock) || 0 });
      }
    });
  }

  const oversold: string[] = [];
  for (const it of items) {
    const l = loc.get(it.id);
    if (!l) continue; // envío u otro ítem sin fila de stock
    if (l.current < it.quantity) oversold.push(`${it.id} (había ${l.current}, se pidió ${it.quantity})`);
    await updateCell(l.tab, l.rowNumber, l.col, Math.max(0, l.current - it.quantity));
  }
  return oversold;
}
