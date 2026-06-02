import { NextResponse } from "next/server";
import { getShippingQuote, AndreaniUnavailableError } from "@/lib/andreani";
import { siteConfig } from "@/config/site";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cp = searchParams.get("cp") ?? "";
  const valorStr = searchParams.get("valor") ?? "0";

  if (!/^\d{4}$/.test(cp)) {
    return NextResponse.json(
      { error: "Ingresá un código postal válido (4 dígitos)." },
      { status: 400 },
    );
  }

  const valor = parseFloat(valorStr) || 0;

  try {
    const options = await getShippingQuote(cp, siteConfig.shipping.defaultWeightKg, valor);
    return NextResponse.json({ options });
  } catch (err) {
    console.error("[andreani/quote]", err);
    if (err instanceof AndreaniUnavailableError) {
      return NextResponse.json(
        {
          error: "El servicio de cotización de envíos no está disponible en este momento.",
          unavailable: true,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "No se pudo cotizar el envío. Intentá de nuevo." },
      { status: 500 },
    );
  }
}
