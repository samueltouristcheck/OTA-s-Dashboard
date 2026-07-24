"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";

const SUPER_ADMINS = ["Alexandra", "Samuel"];

type Fila = {
  id: string;
  nombre: string;
  estado: "revisar" | "sin_datos" | "ok";
  aviso: string | null;
  central: number | null;
  mesNombre: string | null;
  año: number | null;
  fiabilidad: number | null;
};

export default function PrediccionesPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : null;
  const isSuperAdmin = SUPER_ADMINS.includes(user?.username || "");

  useEffect(() => {
    if (!token || !isSuperAdmin) return;
    fetch("/api/prevision/revision", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setFilas(Array.isArray(d) ? d : []))
      .catch(() => setFilas([]))
      .finally(() => setCargando(false));
  }, [token, isSuperAdmin]);

  if (!isSuperAdmin) {
    return <div className="text-slate-600">No tienes permisos para acceder a esta sección.</div>;
  }

  const aRevisar = filas.filter((f) => f.estado === "revisar");
  const senseDades = filas.filter((f) => f.estado === "sin_datos");
  const ok = filas.filter((f) => f.estado === "ok");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Predicciones · revisión</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Control interno de las previsiones. Los clientes no ven nada de esto; solo ven su previsión.
        </p>
      </div>

      {cargando ? (
        <div className="p-8 text-center text-slate-500">Revisando...</div>
      ) : (
        <>
          {aRevisar.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-amber-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h2 className="font-medium text-amber-900">Tienes que revisar esto ({aRevisar.length})</h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {aRevisar.map((f) => (
                  <li key={f.id} className="px-5 py-3">
                    <p className="font-medium text-slate-800">{f.nombre}</p>
                    <p className="text-sm text-amber-800 mt-0.5">{f.aviso}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {senseDades.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-slate-400" />
                <h2 className="font-medium text-slate-700">Sin histórico suficiente ({senseDades.length})</h2>
              </div>
              <div className="px-5 py-3 text-sm text-slate-600">
                {senseDades.map((f) => f.nombre).join(", ")}. No tendrán previsión hasta que tengan al menos un año de
                ventas.
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-emerald-50/50 border-b border-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h2 className="font-medium text-slate-700">Previsión correcta ({ok.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-5 py-2 font-medium">Cliente</th>
                    <th className="px-5 py-2 font-medium">Próximo mes</th>
                    <th className="px-5 py-2 font-medium text-right">Previsión</th>
                    <th className="px-5 py-2 font-medium text-right">Fiabilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {ok.map((f) => (
                    <tr key={f.id} className="border-b border-slate-50">
                      <td className="px-5 py-2 text-slate-800">{f.nombre}</td>
                      <td className="px-5 py-2 text-slate-600">
                        {f.mesNombre?.replace(/^\d+\.\s*/, "")} {f.año}
                      </td>
                      <td className="px-5 py-2 text-right font-medium text-slate-800">{f.central?.toLocaleString("es-ES")}</td>
                      <td className="px-5 py-2 text-right text-slate-600">{f.fiabilidad}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
