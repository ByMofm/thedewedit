"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al ingresar");
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[var(--radius-lg)] bg-cream p-8 shadow-soft"
      >
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl text-ink">Panel de productos</h1>
        <p className="mt-1 text-sm text-ink/60">Ingresá la contraseña para administrar el catálogo.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          placeholder="Contraseña"
          className="mt-5 w-full rounded-full border border-ink/15 px-4 py-2.5 text-sm outline-none focus:border-ink/40"
        />
        {error && <p className="mt-2 text-sm text-peach">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 w-full rounded-full bg-ink py-2.5 text-sm font-medium text-cream-soft hover:bg-ink/85 disabled:opacity-50"
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
