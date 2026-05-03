import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[mp/webhook] notification received", {
      type: body.type,
      action: body.action,
      data: body.data,
    });

    // TODO: consultar el pago en MP con su SDK, actualizar DB y enviar email con Resend.
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[mp/webhook] error", error);
    return NextResponse.json({ received: false }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
