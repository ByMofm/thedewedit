"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { ProductInput, ProductSummary } from "@/lib/admin-products";
// nota: import type → no arrastra sheets.ts (node:crypto) al bundle del cliente.

interface CategoryOption {
  slug: string;
  label: string;
}

interface VariantForm {
  variantId?: string;
  nombre: string;
  precio: string;
  stock: string;
}

interface FormState {
  nombre: string;
  marca: string;
  categoria: string;
  precio: string;
  precioTachado: string;
  descripcionCorta: string;
  descripcion: string;
  tags: string;
  destacado: boolean;
  imagenes: string[];
  hasVariants: boolean;
  stock: string;
  variants: VariantForm[];
}

const EMPTY: FormState = {
  nombre: "",
  marca: "",
  categoria: "",
  precio: "",
  precioTachado: "",
  descripcionCorta: "",
  descripcion: "",
  tags: "",
  destacado: false,
  imagenes: [],
  hasVariants: false,
  stock: "0",
  variants: [],
};

const input = "w-full rounded-xl border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ink/40";
const label = "block text-xs font-medium uppercase tracking-wide text-ink/50 mb-1";

export function ProductAdmin({ categories }: { categories: CategoryOption[] }) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadList() {
    setBusy(true);
    const res = await fetch("/api/admin/products");
    const data = await res.json();
    setBusy(false);
    if (res.ok) setProducts(data.products);
    else setError(data.error ?? "Error al cargar");
  }

  useEffect(() => {
    loadList();
  }, []);

  function startNew() {
    setEditingId(null);
    setForm(EMPTY);
    setError("");
    setView("form");
  }

  async function startEdit(id: string) {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/admin/products/${id}`);
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Error al cargar el producto");
    const p: ProductInput = data.product;
    setEditingId(id);
    setForm({
      nombre: p.nombre,
      marca: p.marca ?? "",
      categoria: p.categoria,
      precio: String(p.precio),
      precioTachado: p.precioTachado ? String(p.precioTachado) : "",
      descripcionCorta: p.descripcionCorta,
      descripcion: p.descripcion,
      tags: p.tags.join(", "),
      destacado: p.destacado,
      imagenes: p.imagenes,
      hasVariants: p.variants.length > 0,
      stock: String(p.stock ?? 0),
      variants: p.variants.map((v) => ({
        variantId: v.variantId,
        nombre: v.nombre,
        precio: v.precio ? String(v.precio) : "",
        stock: String(v.stock),
      })),
    });
    setView("form");
  }

  function buildPayload(): ProductInput {
    const num = (s: string): number => Number(s.trim());
    return {
      nombre: form.nombre,
      marca: form.marca || undefined,
      categoria: form.categoria,
      precio: num(form.precio),
      precioTachado: form.precioTachado.trim() ? num(form.precioTachado) : null,
      descripcionCorta: form.descripcionCorta,
      descripcion: form.descripcion,
      imagenes: form.imagenes,
      destacado: form.destacado,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      stock: form.hasVariants ? 0 : num(form.stock),
      variants: form.hasVariants
        ? form.variants.map((v) => ({
            variantId: v.variantId,
            nombre: v.nombre,
            precio: v.precio.trim() ? num(v.precio) : null,
            stock: num(v.stock),
          }))
        : [],
    };
  }

  async function uploadImage(file: File) {
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && data.url) setForm((f) => ({ ...f, imagenes: [...f.imagenes, data.url] }));
    else setError(data.error ?? `Error al subir la imagen (HTTP ${res.status})`);
  }

  async function save(thenPublish: boolean) {
    setBusy(true);
    setError("");
    setNotice("");
    const payload = buildPayload();
    const res = editingId
      ? await fetch(`/api/admin/products/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      return setError(data.error ?? "Error al guardar");
    }
    if (thenPublish) {
      const pub = await fetch("/api/admin/publish", { method: "POST" });
      if (!pub.ok) {
        setBusy(false);
        const pd = await pub.json().catch(() => ({}));
        return setError(`Guardado, pero falló publicar: ${JSON.stringify(pd.error ?? pub.status)}`);
      }
    }
    setBusy(false);
    setNotice(thenPublish ? "Guardado. La tienda se actualiza en 1–2 minutos." : "Guardado en el catálogo.");
    await loadList();
    setView("list");
  }

  async function remove() {
    if (!editingId) return;
    if (!confirm(`¿Eliminar "${form.nombre || editingId}"? No se puede deshacer.`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    const res = await fetch(`/api/admin/products/${editingId}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      const d = await res.json().catch(() => ({}));
      return setError(d.error ?? `Error al eliminar (HTTP ${res.status})`);
    }
    await fetch("/api/admin/publish", { method: "POST" }).catch(() => {}); // best-effort
    setBusy(false);
    setNotice("Producto eliminado. La tienda se actualiza en 1–2 minutos.");
    await loadList();
    setView("list");
  }

  // ── Lista ──────────────────────────────────────────────────────────────────
  if (view === "list") {
    const filtered = products.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()));
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl text-ink">Productos</h1>
          <button onClick={startNew} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream-soft hover:bg-ink/85">
            + Nuevo producto
          </button>
        </div>

        {notice && <p className="mt-4 rounded-xl bg-dew/40 px-4 py-2 text-sm text-ink">{notice}</p>}
        {error && <p className="mt-4 rounded-xl bg-peach/20 px-4 py-2 text-sm text-ink">{error}</p>}

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar…"
          className={`${input} mt-6`}
        />

        <div className="mt-4 divide-y divide-ink/10">
          {busy && products.length === 0 && <p className="py-6 text-sm text-ink/50">Cargando…</p>}
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => startEdit(p.id)}
              className="flex w-full items-center gap-3 py-3 text-left hover:bg-cream/60"
            >
              {p.imagen ? (
                <Image
                  src={p.imagen}
                  alt={p.nombre}
                  width={56}
                  height={56}
                  className="size-14 shrink-0 rounded-xl border border-ink/10 object-cover"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-cream text-[10px] text-ink/30">
                  sin foto
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{p.nombre}</span>
                <span className="block text-xs text-ink/50">{p.categoria}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-base font-semibold text-ink">${p.precio.toLocaleString("es-AR")}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.stock <= 0 ? "bg-peach/25 text-peach" : "bg-dew/50 text-ink"
                  }`}
                >
                  {p.stock <= 0 ? "Sin stock" : `${p.stock} u.`}
                  {p.hasVariants ? " · var." : ""}
                </span>
              </span>
            </button>
          ))}
          {!busy && filtered.length === 0 && <p className="py-6 text-sm text-ink/50">Sin resultados.</p>}
        </div>
      </main>
    );
  }

  // ── Formulario ───────────────────────────────────────────────────────────────
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const digits = (s: string) => s.replace(/\D/g, ""); // solo números enteros

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <button onClick={() => setView("list")} className="text-sm text-ink/60 hover:text-ink">
        ← Volver
      </button>
      <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-ink">
        {editingId ? "Editar producto" : "Nuevo producto"}
      </h1>
      {editingId && <p className="text-xs text-ink/40">id: {editingId}</p>}

      {error && <p className="mt-4 rounded-xl bg-peach/20 px-4 py-2 text-sm text-ink">{error}</p>}

      <div className="mt-6 space-y-4">
        <div>
          <label className={label}>Nombre *</label>
          <input className={input} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Marca</label>
            <input className={input} value={form.marca} onChange={(e) => set("marca", e.target.value)} />
          </div>
          <div>
            <label className={label}>Categoría *</label>
            <select className={input} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
              <option value="">Elegí una…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Precio *</label>
            <input className={input} inputMode="numeric" value={form.precio} onChange={(e) => set("precio", digits(e.target.value))} />
          </div>
          <div>
            <label className={label}>Precio tachado</label>
            <input className={input} inputMode="numeric" value={form.precioTachado} onChange={(e) => set("precioTachado", digits(e.target.value))} />
          </div>
        </div>

        <div>
          <label className={label}>Descripción corta</label>
          <input className={input} value={form.descripcionCorta} onChange={(e) => set("descripcionCorta", e.target.value)} />
        </div>
        <div>
          <label className={label}>Descripción</label>
          <textarea className={`${input} min-h-28`} value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
        </div>
        <div>
          <label className={label}>Tags (separados por coma)</label>
          <input className={input} value={form.tags} onChange={(e) => set("tags", e.target.value)} />
        </div>

        {/* Imágenes */}
        <div>
          <label className={label}>Imágenes *</label>
          <div className="flex flex-wrap gap-2">
            {form.imagenes.map((url) => (
              <div key={url} className="relative">
                <Image src={url} alt="" width={72} height={72} className="size-[72px] rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => set("imagenes", form.imagenes.filter((u) => u !== url))}
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-xs text-cream-soft"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="flex size-[72px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-ink/30 text-xs text-ink/50 hover:border-ink/50">
              + Foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={form.destacado} onChange={(e) => set("destacado", e.target.checked)} />
          Destacado en el home
        </label>

        {/* Variantes vs stock simple */}
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.hasVariants}
            onChange={(e) => set("hasVariants", e.target.checked)}
          />
          Tiene variantes (tonos, colores…)
        </label>

        {!form.hasVariants ? (
          <div className="w-32">
            <label className={label}>Stock *</label>
            <input className={input} inputMode="numeric" value={form.stock} onChange={(e) => set("stock", digits(e.target.value))} />
          </div>
        ) : (
          <div className="space-y-2 rounded-xl bg-cream/60 p-3">
            {form.variants.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={`${input} flex-1`}
                  placeholder="Nombre variante"
                  value={v.nombre}
                  onChange={(e) =>
                    set("variants", form.variants.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))
                  }
                />
                <input
                  className={`${input} w-24`}
                  inputMode="numeric"
                  placeholder="Precio"
                  value={v.precio}
                  onChange={(e) =>
                    set("variants", form.variants.map((x, j) => (j === i ? { ...x, precio: digits(e.target.value) } : x)))
                  }
                />
                <input
                  className={`${input} w-20`}
                  inputMode="numeric"
                  placeholder="Stock"
                  value={v.stock}
                  onChange={(e) =>
                    set("variants", form.variants.map((x, j) => (j === i ? { ...x, stock: digits(e.target.value) } : x)))
                  }
                />
                <button
                  type="button"
                  onClick={() => set("variants", form.variants.filter((_, j) => j !== i))}
                  className="px-1 text-ink/40 hover:text-peach"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set("variants", [...form.variants, { nombre: "", precio: "", stock: "0" }])}
              className="text-sm text-lavender-deep hover:underline"
            >
              + Agregar variante
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={() => save(false)}
          disabled={busy}
          className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink hover:border-ink/40 disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
        <button
          onClick={() => save(true)}
          disabled={busy}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream-soft hover:bg-ink/85 disabled:opacity-50"
        >
          Guardar y publicar
        </button>
        {editingId && (
          <button
            onClick={remove}
            disabled={busy}
            className="ml-auto rounded-full border border-peach/50 px-5 py-2.5 text-sm font-medium text-peach hover:bg-peach/10 disabled:opacity-50"
          >
            Eliminar
          </button>
        )}
      </div>
    </main>
  );
}
