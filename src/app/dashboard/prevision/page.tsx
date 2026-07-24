"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingUp, Info } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";

type Desglose = { nombre: string; valor: number };

type Prevision = {
  hayDatos: boolean;
  mensaje?: string;
  avisoDatos?: string;
  año: number;
  mesNombre: string;
  central: number;
  min: number;
  max: number;
  fiabilidad: { porcentaje: number; motivos: string[] };
  explicacion: string[];
  historico: { año: number; entradas: number }[];
};

type Analisi = {
  prevision: Prevision;
  desglose: { porOta: Desglose[]; porProducto: Desglose[] };
  recomendaciones: string[];
};

function nf(n: number) {
  return n.toLocaleString("es-ES");
}

export default function PrevisionPage() {
  const [analisi, setAnalisi] = useState<Analisi | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [cargando, setCargando] = useState(true);

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

  const cargar = useCallback(
    async (cid?: string) => {
      if (!token) return;
      setCargando(true);
      try {
        const url = cid ? `/api/prevision?clienteId=${encodeURIComponent(cid)}` : "/api/prevision";
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        setAnalisi(await res.json());
      } catch {
        setAnalisi(null);
      } finally {
        setCargando(false);
      }
    },
    [token]
  );

  useEffect(() => {
    // Client: la seva. Admin: la del client triat.
    if (!isAdmin) cargar();
    else if (clienteId) cargar(clienteId);
  }, [isAdmin, clienteId, cargar]);

  const p = analisi?.prevision;

  // Punts del gràfic: històric del mateix mes + la previsió com a continuació.
  const chartData = p?.hayDatos
    ? [...p.historico.map((h) => ({ año: String(h.año), entradas: h.entradas })), { año: String(p.año), entradas: p.central }]
    : [];

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

      {/* Avís intern: només per a admin, mai per al client (l'API ja el treu si el rol és client). */}
      {isAdmin && p?.avisoDatos && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{p.avisoDatos}</span>
        </div>
      )}

      {cargando ? (
        <div className="p-8 text-center text-slate-500">Calculando...</div>
      ) : !p?.hayDatos ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          {p?.mensaje || "No hay datos suficientes para una previsión."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Previsió central + rang */}
            <div className="p-6 bg-white rounded-xl border-2 border-blue-200 shadow-sm">
              <p className="text-sm text-slate-500">
                Previsión para <span className="font-medium text-slate-700">{p.mesNombre.replace(/^\d+\.\s*/, "")} {p.año}</span>
              </p>
              <p className="text-4xl font-semibold text-slate-800 mt-1">{nf(p.central)}</p>
              <p className="text-sm text-slate-500 mt-1">
                entre {nf(p.min)} y {nf(p.max)} entradas
              </p>
            </div>

            {/* Fiabilitat */}
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500">Fiabilidad</p>
              <p className="text-4xl font-semibold text-slate-800 mt-1">{p.fiabilidad.porcentaje}%</p>
              <p className="text-xs text-slate-500 mt-1 capitalize">{p.fiabilidad.motivos.join(" · ")}</p>
            </div>

            {/* Recomanacions */}
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500 mb-2">Recomendaciones</p>
              {analisi!.recomendaciones.length ? (
                <ul className="space-y-1.5 text-sm text-slate-700">
                  {analisi!.recomendaciones.map((r, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-blue-500">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">Sin recomendaciones este mes.</p>
              )}
            </div>
          </div>

          {/* Explicació de com s'ha calculat el número */}
          {p.explicacion.length > 0 && (
            <div className="p-6 bg-blue-50/50 rounded-xl border border-blue-100">
              <p className="text-sm font-medium text-slate-700 mb-2">Cómo hemos calculado esto</p>
              <ol className="space-y-1.5 text-sm text-slate-700">
                {p.explicacion.map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-blue-400 font-medium">{i + 1}.</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gràfic any rere any */}
            <div className="lg:col-span-2 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500 mb-3">
                {p.mesNombre.replace(/^\d+\.\s*/, "")} en años anteriores y la previsión de {p.año}
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ right: 20, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="año" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip cursor={false} formatter={(v: number) => [nf(v), "Entradas"]} />
                    <Line type="monotone" dataKey="entradas" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
                    <ReferenceDot x={String(p.año)} y={p.central} r={5} fill="#f59e0b" stroke="#fff" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-400 mt-1">El punto naranja es la previsión.</p>
            </div>

            {/* Desglossament per OTA */}
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500 mb-3">Previsión por OTA</p>
              <ul className="space-y-2">
                {analisi!.desglose.porOta.slice(0, 8).map((d) => (
                  <li key={d.nombre} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 truncate">{d.nombre}</span>
                    <span className="font-medium text-slate-800">{nf(d.valor)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            La previsión es orientativa: no tiene en cuenta exposiciones nuevas, eventos ni puentes excepcionales.
          </p>
        </>
      )}
    </div>
  );
}
