"use client";

import { useEffect, useState } from "react";
import { ChartLine } from "@/components/ChartLine";
import { ChartBar } from "@/components/ChartBar";
import { ChartPie } from "@/components/ChartPie";
import { ChartLineComparativa } from "@/components/ChartLineComparativa";
import { ChartBarComparativa } from "@/components/ChartBarComparativa";
import { ChartBarComparativaMeses } from "@/components/ChartBarComparativaMeses";
import { ResumenVentasTable } from "@/components/ResumenVentasTable";
import { TrendingUp, Ticket, Calendar, BarChart2, X } from "lucide-react";
import { MultiSelect } from "@/components/MultiSelect";

type Stats = {
  total: number;
  porMes: Record<string, number>;
  porOta: Record<string, number>;
  porTipo: Record<string, number>;
  porProducto: Record<string, number>;
  porAño: Record<number, number>;
};

type Venta = {
  id: string;
  cliente: { nombre: string };
  ota: string;
  tipoEntrada: string;
  mes: string;
  anio: number;
  numeroEntradas: number;
  producto: string;
};

type Props = {
  token: string | null;
  clienteId: string;
  clientes?: { id: string; nombre: string }[];
  isAdmin?: boolean;
  showClienteFilter?: boolean;
  /** Para clientes: solo dashboard + tabla numérica */
  clientMode?: boolean;
};

export function DashboardContent({
  token,
  clienteId,
  clientes = [],
  isAdmin = false,
  showClienteFilter = false,
  clientMode = false,
}: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [año, setAño] = useState<number[]>([]);
  const [mes, setMes] = useState<string[]>([]);
  const [ota, setOta] = useState<string[]>([]);
  const [tipoEntrada, setTipoEntrada] = useState<string[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [otas, setOtas] = useState<string[]>([]);
  const [añosOpt, setAñosOpt] = useState<number[]>([]);
  const [mesesOpt, setMesesOpt] = useState<string[]>([]);
  const [comparativa, setComparativa] = useState<string>("");
  const [comparativaData, setComparativaData] = useState<{
    tipo: string;
    porAño?: Record<number, { porMes: Record<string, number>; total: number; porOta: Record<string, number> }>;
    años?: number[];
    porMes?: Record<string, { porAño: Record<number, number>; total: number }>;
    meses?: string[];
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (año.length) params.set("año", año.join(","));
    if (mes.length) params.set("mes", mes.join(","));
    if (ota.length) params.set("ota", ota.join(","));
    if (tipoEntrada.length) params.set("tipoEntrada", tipoEntrada.join(","));
    if (clienteId) params.set("clienteId", clienteId);

    Promise.all([
      fetch(`/api/sheets/stats?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`/api/sheets/data?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([s, v]) => {
        const { filterOptions, ...statsData } = s || {};
        const data = s?.total !== undefined ? statsData : { total: 0, porMes: {}, porOta: {}, porTipo: {}, porProducto: {}, porAño: {} };
        setStats(data);
        if (filterOptions?.tipos?.length) setTipos(filterOptions.tipos);
        if (filterOptions?.otas?.length) setOtas(filterOptions.otas);
        if (filterOptions?.años?.length) setAñosOpt(filterOptions.años);
        if (filterOptions?.meses?.length) setMesesOpt(filterOptions.meses);
        setVentas(Array.isArray(v) ? v : []);
      })
      .catch(() => {
        setStats({ total: 0, porMes: {}, porOta: {}, porTipo: {}, porProducto: {}, porAño: {} });
        setVentas([]);
      });
  }, [token, año, mes, ota, tipoEntrada, clienteId]);

  useEffect(() => {
    if (!token || !comparativa) {
      setComparativaData(null);
      return;
    }
    const params = new URLSearchParams();
    params.set("comparativa", comparativa);
    if (año.length) params.set("año", año.join(","));
    if (mes.length) params.set("mes", mes.join(","));
    if (ota.length) params.set("ota", ota.join(","));
    if (tipoEntrada.length) params.set("tipoEntrada", tipoEntrada.join(","));
    if (clienteId) params.set("clienteId", clienteId);

    fetch(`/api/sheets/stats-comparativa?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setComparativaData(d.tipo ? d : null))
      .catch(() => setComparativaData(null));
  }, [token, comparativa, año, mes, ota, tipoEntrada, clienteId]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  const MESES_ORDER = ["01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio", "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre"];
  const MESES_NOMBRES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const lineData = MESES_ORDER.map((mes, idx) => {
    let entradas = 0;
    for (const [key, val] of Object.entries(stats.porMes)) {
      const keyNorm = String(key).replace(/^\d+\.\s*/, "").trim().toLowerCase();
      if (keyNorm === MESES_NOMBRES[idx]) entradas += val;
    }
    return { mes, entradas };
  });
  const barData = Object.entries(stats.porOta).map(([name, entradas]) => ({ name, entradas }));
  const pieData = Object.entries(stats.porTipo).map(([name, value]) => ({ name, value }));

  const años = añosOpt.length ? añosOpt : Object.keys(stats.porAño).map(Number).sort((a, b) => b - a);
  const tiposList = [...new Set(tipos.length ? tipos : Object.keys(stats.porTipo || {}))].sort();
  const otasList = [...new Set(otas.length ? otas : Object.keys(stats.porOta || {}))].sort();
  const MESES_LIST = MESES_ORDER;
  const mesesList = mesesOpt.length ? mesesOpt : MESES_LIST;
  const añoActual = años[0] || new Date().getFullYear();
  const añoAnterior = años[1] || añoActual - 1;
  const totalActual = stats.porAño[añoActual] || 0;
  const totalAnterior = stats.porAño[añoAnterior] || 0;
  const crecimiento = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">
          Ventas de entradas{clienteId ? ` - ${clienteId}` : ""}
        </h2>
        <div className="flex flex-wrap gap-2 items-center">
          {showClienteFilter && isAdmin && (
            <select className="h-9 px-3 border border-slate-200 rounded-lg text-sm" disabled>
              <option>{clienteId || "Cliente"}</option>
            </select>
          )}
          <span className="text-xs text-slate-500">Años:</span>
          <MultiSelect options={[...new Set(años)].map(String)} selected={año.map(String)} onChange={(v) => setAño(v.map(Number).filter((n) => !isNaN(n)))} placeholder="Todos" />
          <span className="text-xs text-slate-500">Tipos:</span>
          <MultiSelect options={tiposList} selected={tipoEntrada} onChange={setTipoEntrada} placeholder="Todos" />
          <span className="text-xs text-slate-500">Meses:</span>
          <MultiSelect options={[...new Set(mesesList)]} selected={mes} onChange={setMes} placeholder="Todos" label={(m) => m.replace(/^\d+\.\s*/, "")} />
          <span className="text-xs text-slate-500">OTAs:</span>
          <MultiSelect options={otasList} selected={ota} onChange={setOta} placeholder="Todas" />
          <span className="text-xs text-slate-500">Comparativa:</span>
          <select value={comparativa} onChange={(e) => setComparativa(e.target.value)} className="h-9 px-3 border border-slate-200 rounded-lg text-sm">
            <option value="">Ninguna</option>
            <option value="interanual">Interanual</option>
            <option value="intermensual">Intermensual</option>
          </select>
          {(año.length || mes.length || ota.length || tipoEntrada.length || comparativa) && (
            <button onClick={() => { setAño([]); setMes([]); setOta([]); setTipoEntrada([]); setComparativa(""); }} className="flex items-center gap-1.5 h-9 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg">
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Ticket className="w-5 h-5" />
            <span className="text-sm font-medium">Total entradas</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.total.toLocaleString()}</p>
        </div>
        <div className="p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">Año {añoActual}</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalActual.toLocaleString()}</p>
        </div>
        <div className="p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Crecimiento YoY</span>
          </div>
          <p className={`text-3xl font-bold ${Number(crecimiento) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {crecimiento}%
          </p>
        </div>
        <div className="p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <BarChart2 className="w-5 h-5" />
            <span className="text-sm font-medium">Año anterior ({añoAnterior})</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalAnterior.toLocaleString()}</p>
        </div>
      </div>

      {comparativa && comparativaData && (
        <div className="p-6 bg-white rounded-xl border-2 border-blue-200 shadow-sm space-y-6">
          <h2 className="font-semibold text-slate-800 text-lg">Comparativa {comparativa === "interanual" ? "interanual" : "intermensual"}</h2>
          {comparativa === "interanual" && comparativaData.porAño && comparativaData.años && comparativaData.años.length > 0 && (
            <>
              <div className="flex flex-wrap gap-4">
                {comparativaData.años.map((a) => (
                  <div key={a} className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-sm text-slate-600">Año {a}:</span>
                    <span className="ml-2 font-bold text-slate-800">{comparativaData.porAño![a].total.toLocaleString()} entradas</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-slate-700 mb-4">Ventas por mes (años superpuestos)</h3>
                  <ChartLineComparativa series={comparativaData.años.map((a) => ({ año: a, porMes: comparativaData.porAño![a].porMes }))} />
                </div>
                <div>
                  <h3 className="font-medium text-slate-700 mb-4">Ventas por OTA (años superpuestos)</h3>
                  <ChartBarComparativa series={comparativaData.años.map((a) => ({ año: a, porOta: comparativaData.porAño![a].porOta }))} />
                </div>
              </div>
            </>
          )}
          {comparativa === "intermensual" && comparativaData.porMes && comparativaData.meses && (
            <div>
              <h3 className="font-medium text-slate-700 mb-4">Ventas por mes (años superpuestos)</h3>
              <ChartBarComparativaMeses porMes={comparativaData.porMes} años={[...new Set(Object.values(comparativaData.porMes).flatMap((m) => Object.keys(m.porAño).map(Number)))].sort((a, b) => b - a)} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <h3 className="font-medium text-slate-800 mb-4">Ventas por mes</h3>
          <ChartLine data={lineData} />
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <h3 className="font-medium text-slate-800 mb-4">Ventas por OTA</h3>
          <ChartBar data={barData} />
        </div>
      </div>

      <div className={`grid grid-cols-1 ${Object.keys(stats.porProducto || {}).filter((p) => p?.trim() && p.trim() !== "General").length > 0 ? "lg:grid-cols-2" : ""} gap-6`}>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <h3 className="font-medium text-slate-800 mb-4">Tipo de entrada</h3>
          <ChartPie data={pieData} />
        </div>
        {Object.keys(stats.porProducto || {}).filter((p) => p?.trim() && p.trim() !== "General").length > 0 && (
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h3 className="font-medium text-slate-800 mb-4">Ventas por producto</h3>
            <ChartBar data={Object.entries(stats.porProducto).map(([name, entradas]) => ({ name, entradas }))} />
          </div>
        )}
      </div>

      <div className="p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4 text-lg">Resumen Ventas OTAs</h3>
        <p className="text-xs text-slate-500 mb-3">Mes respuesta / Número de entradas</p>
        <ResumenVentasTable ventas={ventas} />
      </div>
    </div>
  );
}
