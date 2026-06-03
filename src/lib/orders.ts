import crypto from "node:crypto";

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

export async function forwardOrderToSheets(order: OrderRecord): Promise<{ ok: boolean; reason?: string }> {
  const url = process.env.ORDERS_WEBHOOK_URL;
  const token = process.env.ORDERS_WEBHOOK_TOKEN;
  if (!url || !token) {
    return { ok: false, reason: "no_config" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, order }),
  });
  if (!res.ok) {
    return { ok: false, reason: `sheets_${res.status}` };
  }
  return { ok: true };
}
