"use client";

import { useState } from "react";

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; message?: string; error?: string } | null>(null);

  async function runSetup() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/auth/setup", { method: "POST" });
      const data = await res.json();
      setResult(res.ok ? { ok: true, message: data.message } : { error: data.error || "Error" });
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Configuración inicial</h1>
        <p className="text-sm text-slate-600 mb-6">
          Arregla usuarios y contraseñas. Super admins: Alexandra / Alexandra123, Samuel / Samuel123. Clientes: usuario = nombre del cliente, contraseña = cliente123
        </p>
        <button
          onClick={runSetup}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Ejecutando..." : "Ejecutar setup"}
        </button>
        {result && (
          <div
            className={`mt-4 p-4 rounded-lg text-sm ${
              result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
            }`}
          >
            {result.ok ? result.message : result.error}
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">
          <a href="/login" className="text-blue-600 hover:underline">
            Ir al login →
          </a>
        </p>
      </div>
    </div>
  );
}
