import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

// Sube una imagen a Vercel Blob (storage público) y devuelve su URL de CDN.
// Requiere BLOB_READ_WRITE_TOKEN (lo setea Vercel al vincular un Blob store).
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
  }

  try {
    const blob = await put(`productos/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: `Error al subir a Blob: ${(e as Error).message}` }, { status: 500 });
  }
}
