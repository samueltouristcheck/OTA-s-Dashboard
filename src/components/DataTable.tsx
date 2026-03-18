"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const MES_ORDER = ["01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio", "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre"];

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

type SortKey = "cliente" | "ota" | "tipoEntrada" | "mes" | "anio" | "numeroEntradas" | "producto";

export function DataTable({ ventas }: { ventas: Venta[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("anio");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    return [...ventas].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "anio") {
        cmp = a.anio - b.anio;
        if (cmp === 0) cmp = MES_ORDER.indexOf(a.mes) - MES_ORDER.indexOf(b.mes);
      } else if (sortBy === "mes") cmp = MES_ORDER.indexOf(a.mes) - MES_ORDER.indexOf(b.mes);
      else if (sortBy === "numeroEntradas") cmp = a.numeroEntradas - b.numeroEntradas;
      else if (sortBy === "cliente") cmp = (a.cliente?.nombre || "").localeCompare(b.cliente?.nombre || "");
      else if (sortBy === "ota") cmp = a.ota.localeCompare(b.ota);
      else if (sortBy === "tipoEntrada") cmp = a.tipoEntrada.localeCompare(b.tipoEntrada);
      else if (sortBy === "producto") cmp = a.producto.localeCompare(b.producto);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [ventas, sortBy, sortDir]);

  function handleSort(key: SortKey) {
    setSortBy(key);
    setSortDir((d) => (sortBy === key ? (d === "asc" ? "desc" : "asc") : "desc"));
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 ml-1" /> : <ArrowDown className="w-3.5 h-3.5 ml-1" />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-sm">
      <table className="min-w-full text-sm border-collapse">
        <thead className="bg-slate-200 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-800 border-b border-r border-slate-300">
              <button onClick={() => handleSort("cliente")} className="flex items-center hover:text-slate-600">
                Cliente <SortIcon col="cliente" />
              </button>
            </th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-800 border-b border-r border-slate-300">
              <button onClick={() => handleSort("ota")} className="flex items-center hover:text-slate-600">
                OTA <SortIcon col="ota" />
              </button>
            </th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-800 border-b border-r border-slate-300">
              <button onClick={() => handleSort("tipoEntrada")} className="flex items-center hover:text-slate-600">
                Tipo entrada <SortIcon col="tipoEntrada" />
              </button>
            </th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-800 border-b border-r border-slate-300">
              <button onClick={() => handleSort("mes")} className="flex items-center hover:text-slate-600">
                Mes <SortIcon col="mes" />
              </button>
            </th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-800 border-b border-r border-slate-300">
              <button onClick={() => handleSort("anio")} className="flex items-center hover:text-slate-600">
                Año <SortIcon col="anio" />
              </button>
            </th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-800 border-b border-r border-slate-300">
              <button onClick={() => handleSort("producto")} className="flex items-center hover:text-slate-600">
                Producto <SortIcon col="producto" />
              </button>
            </th>
            <th className="px-3 py-2.5 text-right font-semibold text-slate-800 border-b border-slate-300">
              <button onClick={() => handleSort("numeroEntradas")} className="flex items-center justify-end w-full hover:text-slate-600">
                Entradas <SortIcon col="numeroEntradas" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((v, i) => (
            <tr key={v.id} className={`hover:bg-blue-50/50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
              <td className="px-3 py-2 border-b border-r border-slate-200 text-slate-800">{v.cliente?.nombre}</td>
              <td className="px-3 py-2 border-b border-r border-slate-200 text-slate-700">{v.ota}</td>
              <td className="px-3 py-2 border-b border-r border-slate-200 text-slate-700">{v.tipoEntrada}</td>
              <td className="px-3 py-2 border-b border-r border-slate-200 text-slate-700">{v.mes.replace(/^\d+\.\s*/, "")}</td>
              <td className="px-3 py-2 border-b border-r border-slate-200 text-slate-700">{v.anio}</td>
              <td className="px-3 py-2 border-b border-r border-slate-200 text-slate-700">{v.producto}</td>
              <td className="px-3 py-2 border-b border-slate-200 text-right font-medium text-slate-800">{v.numeroEntradas.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="px-5 py-8 text-center text-slate-500">No hay datos con los filtros seleccionados.</div>
      )}
    </div>
  );
}
