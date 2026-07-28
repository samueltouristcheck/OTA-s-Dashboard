"use client";

import { useCallback, useEffect, useState } from "react";
import { Info } from "lucide-react";
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

/**
 * Panell de previsió de vendes d'un client. Es fa servir a la pàgina "Previsión" i dins de la vista de
 * client del superadmin.
 *
 * @param clienteId  quin client (nom o id); si s'omet, s'usa el del propi token (cas d'un museu).
 * @param mostrarAviso  ensenyar l'avís intern de dades incompletes. Fals a la vista de client, perquè
 *   allà l'admin veu el que veu el museu.
 */
export function PrevisionPanel({ clienteId, mostrarAviso }: { clienteId?: string; mostrarAviso?: boolean }) {
  const [analisi, setAnalisi] = useState<Analisi | null>(null);
  const [cargando, setCargando] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    try {
      const url = clienteId ? `/api/prevision?clienteId=${encodeURIComponent(clienteId)}` : "/api/prevision";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      setAnalisi(await res.json());
    } catch {
      setAnalisi(null);
    } finally {
      setCargando(false);
    }
  }, [token, clienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const p = analisi?.prevision;

  const chartData = p?.hayDatos
    ? [...p.historico.map((h) => ({ año: String(h.año), entradas: h.entradas })), { año: String(p.año), entradas: p.central }]
    : [];

  if (cargando) return <div className="p-8 text-center text-slate-500">Calculando previsión...</div>;

  if (!p?.hayDatos) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        {p?.mensaje || "No hay datos suficientes para una previsión."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {mostrarAviso && p.avisoDatos && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{p.avisoDatos}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-6 bg-white rounded-xl border-2 border-blue-200 shadow-sm">
          <p className="text-sm text-slate-500">
            Previsión para <span className="font-medium text-slate-700">{p.mesNombre.replace(/^\d+\.\s*/, "")} {p.año}</span>
          </p>
          <p className="text-4xl font-semibold text-slate-800 mt-1">{nf(p.central)}</p>
          <p className="text-sm text-slate-500 mt-1">
            entre {nf(p.min)} y {nf(p.max)} entradas
          </p>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Fiabilidad</p>
          <p className="text-4xl font-semibold text-slate-800 mt-1">{p.fiabilidad.porcentaje}%</p>
          <p className="text-xs text-slate-500 mt-1 capitalize">{p.fiabilidad.motivos.join(" · ")}</p>
        </div>

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
    </div>
  );
}
