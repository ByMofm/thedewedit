import { NextResponse } from "next/server";
import { getPayment } from "@/lib/mercadopago";
import { persistOrder, verifyMpSignature, type OrderRecord } from "@/lib/orders";
import { triggerRedeploy } from "@/lib/redeploy";

interface MpNotification {
  type?: string;
  action?: string;
  data?: { id?: string };
}

interface MpPaymentResponse {
  id?: number | string;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  payment_method_id?: string;
  installments?: number;
  date_created?: string;
  date_approved?: string;
  order?: { id?: string };
  payer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: { number?: string };
  };
  additional_info?: {
    items?: Array<{
      id?: string;
      title?: string;
      quantity?: string | number;
      unit_price?: string | number;
    }>;
    shipments?: {
      receiver_address?: {
        street_name?: string;
        street_number?: string;
        zip_code?: string;
      };
    };
  };
}

function toOrderRecord(p: MpPaymentResponse): OrderRecord {
  const itemsSrc = p.additional_info?.items ?? [];
  const items = itemsSrc.map((it) => ({
    id: String(it.id ?? ""),
    title: String(it.title ?? ""),
    quantity: Number(it.quantity ?? 0),
    unitPrice: Number(it.unit_price ?? 0),
  }));

  const address = p.additional_info?.shipments?.receiver_address;
  const fullAddress = address
    ? [address.street_name, address.street_number].filter(Boolean).join(" ") || null
    : null;

  const payerName = [p.payer?.first_name, p.payer?.last_name].filter(Boolean).join(" ").trim() || null;

  return {
    paymentId: String(p.id ?? ""),
    preferenceId: p.order?.id ? String(p.order.id) : null,
    status: p.status ?? "unknown",
    statusDetail: p.status_detail ?? null,
    amount: Number(p.transaction_amount ?? 0),
    currency: p.currency_id ?? "ARS",
    paymentMethod: p.payment_method_id ?? null,
    installments: p.installments ?? null,
    payerEmail: p.payer?.email ?? null,
    payerName,
    payerPhone: p.payer?.phone?.number ?? null,
    shippingAddress: fullAddress,
    shippingZip: address?.zip_code ?? null,
    items,
    createdAt: p.date_created ?? new Date().toISOString(),
    approvedAt: p.date_approved ?? null,
  };
}

export async function POST(request: Request) {
  let body: MpNotification = {};
  try {
    body = (await request.json()) as MpNotification;
  } catch {
    return NextResponse.json({ received: false, error: "invalid_json" }, { status: 200 });
  }

  if (body.type !== "payment") {
    return NextResponse.json({ received: true, ignored: body.type ?? "unknown" });
  }

  const paymentId = body.data?.id;
  if (!paymentId) {
    return NextResponse.json({ received: true, error: "missing_id" });
  }

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    const ok = verifyMpSignature({
      signatureHeader: request.headers.get("x-signature"),
      requestIdHeader: request.headers.get("x-request-id"),
      dataId: String(paymentId),
      secret,
    });
    if (!ok) {
      console.warn("[mp/webhook] signature verification failed", { paymentId });
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
  } else {
    console.warn("[mp/webhook] MP_WEBHOOK_SECRET not configured — skipping signature check");
  }

  try {
    const payment = (await getPayment(String(paymentId))) as MpPaymentResponse;
    const order = toOrderRecord(payment);

    console.log("[mp/webhook] payment received", {
      paymentId: order.paymentId,
      status: order.status,
      amount: order.amount,
      email: order.payerEmail,
    });

    if (order.status === "approved") {
      const result = await persistOrder(order);
      if (!result.ok) {
        console.warn("[mp/webhook] persist order failed", { reason: result.reason });
      } else if (result.duplicate) {
        console.log("[mp/webhook] duplicate payment, ignored", { paymentId: order.paymentId });
      } else {
        if (result.oversold?.length) {
          console.warn("[mp/webhook] OVERSOLD", { paymentId: order.paymentId, oversold: result.oversold });
        }
        // Stock cambió → republicar para que el catálogo estático lo refleje.
        const redeploy = await triggerRedeploy();
        if (!redeploy.ok) console.warn("[mp/webhook] redeploy failed", { error: redeploy.error });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[mp/webhook] error", error);
    return NextResponse.json({ received: false }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
