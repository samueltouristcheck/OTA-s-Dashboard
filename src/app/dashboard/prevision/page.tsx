"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { PrevisionPanel } from "@/components/PrevisionPanel";

export default function PrevisionPage() {
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [clienteId, setClienteId] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : null;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token || !isAdmin) return;
    fetch("/api/clientes", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((c) => {
        const l = Array.isArray(c) ? c : [];
        setClientes(l);
        if (l.length && !clienteId) setClienteId(l[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Previsión de ventas
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Estimación orientativa para el próximo mes, a partir de tu histórico.</p>
        </div>
        {isAdmin && (
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[220px]"
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Admin: la del client triat, amb l'avís intern. Client: la seva, sense avís. */}
      {isAdmin ? (
        clienteId && <PrevisionPanel clienteId={clienteId} mostrarAviso />
      ) : (
        <PrevisionPanel mostrarAviso={false} />
      )}
    </div>
  );
}
