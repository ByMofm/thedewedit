import { NextResponse } from "next/server";
import type { CartItem, OrderPayer } from "@/types";
import { createPreference } from "@/lib/mercadopago";

interface PreferenceRequest {
  items: CartItem[];
  payer: OrderPayer;
  shippingCost?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PreferenceRequest;

    if (!body.items?.length) {
      return NextResponse.json({ error: "Carrito vacío." }, { status: 400 });
    }
    if (!body.payer?.email) {
      return NextResponse.json({ error: "Datos de contacto incompletos." }, { status: 400 });
    }

    const preference = await createPreference(body.items, body.payer, body.shippingCost);

    return NextResponse.json({
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    });
  } catch (error) {
    console.error("[mp/preference]", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear la preferencia.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
