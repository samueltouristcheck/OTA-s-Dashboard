"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

type Cliente = {
  id: string;
  nombre: string;
  username: string;
  password: string;
  hasUser: boolean;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) return;
    fetch("/api/sheets/clientes", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setClientes(list.map((c: { id: string; nombre: string }) => ({
          ...c,
          username: c.nombre,
          password: "cliente123",
          hasUser: false,
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Lista de clientes</h1>
      <p className="text-slate-600 text-sm">
        Clientes con datos en Google Sheets. Usuario = nombre del cliente, contraseña = cliente123.
      </p>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">#</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Nombre del cliente</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Contraseña</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Dashboard</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c, i) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{c.nombre}</td>
                <td className="px-4 py-3 font-mono">{c.username}</td>
                <td className="px-4 py-3 font-mono text-slate-700">{c.password}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/vista-cliente/${encodeURIComponent(c.nombre)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Ver dashboard
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clientes.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No hay clientes. Verifica que Google Sheets esté configurado y la pestaña &quot;Respuestas de formulario 1&quot; tenga datos con columna Cliente.
          </div>
        )}
      </div>
    </div>
  );
}
