"use client";

import { useEffect, useState } from "react";

export default function ClientesListaPage() {
  const [clientes, setClientes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Entra en el dashboard para ver esta lista.");
      setLoading(false);
      return;
    }
    fetch("/api/clientes-lista", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setClientes(data.clientes || []);
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Cargando...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Clientes</h1>
      <p className="text-slate-600 mb-6">{clientes.length} clientes con perfil</p>
      <ol className="list-decimal list-inside space-y-2 font-mono text-sm">
        {clientes.map((c, i) => (
          <li key={i} className="py-1">
            {c}
          </li>
        ))}
      </ol>
    </div>
  );
}
