import { MercadoPagoConfig, Preference } from "mercadopago";
import type { CartItem, OrderPayer } from "@/types";
import { siteConfig } from "@/config/site";

function getClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "Falta MP_ACCESS_TOKEN en .env.local. Obtenlo en https://www.mercadopago.com.ar/developers/panel",
    );
  }
  return new MercadoPagoConfig({ accessToken });
}

export async function createPreference(items: CartItem[], payer: OrderPayer) {
  const client = getClient();
  const preference = new Preference(client);

  const [firstName, ...rest] = (payer.name ?? "").trim().split(" ");

  const result = await preference.create({
    body: {
      items: items.map((item) => ({
        id: `${item.productId}${item.variantId ? `::${item.variantId}` : ""}`,
        title: item.variantName ? `${item.name} (${item.variantName})` : item.name,
        quantity: item.quantity,
        unit_price: item.price,
        currency_id: siteConfig.currency,
        picture_url: item.image,
      })),
      payer: {
        name: firstName,
        surname: rest.join(" "),
        email: payer.email,
        phone: { number: payer.phone },
        address: {
          street_name: payer.address,
          zip_code: payer.zip,
        },
      },
      back_urls: {
        success: `${siteConfig.url}/checkout/success`,
        failure: `${siteConfig.url}/checkout`,
        pending: `${siteConfig.url}/checkout/success`,
      },
      auto_return: "approved",
      statement_descriptor: siteConfig.name.toUpperCase().replace(/\s/g, ""),
      notification_url: `${siteConfig.url}/api/mercadopago/webhook`,
    },
  });

  return result;
}
