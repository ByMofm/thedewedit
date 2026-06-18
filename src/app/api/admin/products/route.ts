import { NextResponse } from "next/server";
import { createProduct, listProducts, ValidationError, type ProductInput } from "@/lib/admin-products";

export async function GET() {
  try {
    return NextResponse.json({ products: await listProducts() });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: ProductInput;
  try {
    body = (await req.json()) as ProductInput;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  try {
    const id = await createProduct(body);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
