"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";

const MES_ORDER = ["01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio", "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre"];
const MESES_NOMBRES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

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

function normProducto(p: string | undefined): string {
  const t = String(p ?? "").trim();
  return t || "General";
}

function matchMes(mes: string): number {
  const norm = String(mes || "").replace(/^\d+\.\s*/, "").trim().toLowerCase();
  const idx = MESES_NOMBRES.indexOf(norm);
  return idx >= 0 ? idx : -1;
}

type Row = {
  producto?: string;
  productoRowSpan?: number;
  ota?: string;
  otaRowSpan?: number;
  tipo: string;
  isSubtotal?: boolean;
  valores: number[];
};

export function ResumenVentasTable({ ventas }: { ventas: Venta[] }) {
  const distinctProducts = new Set(ventas.map((v) => normProducto(v.producto)));
  const showProductCol = distinctProducts.size > 1;

  const totalesPorMes = MES_ORDER.map(() => 0);

  const pivotSimple: Record<string, Record<string, Record<number, number>>> = {};
  const pivotByProduct: Record<string, Record<string, Record<string, Record<number, number>>>> = {};

  const otasSet = new Set<string>();
  const tiposSet = new Set<string>();

  for (const v of ventas) {
    const ota = v.ota?.trim() || "—";
    const tipo = v.tipoEntrada?.trim() || "General";
    const mesIdx = matchMes(v.mes);
    if (mesIdx < 0) continue;

    otasSet.add(ota);
    tiposSet.add(tipo);

    if (showProductCol) {
      const prod = normProducto(v.producto);
      if (!pivotByProduct[prod]) pivotByProduct[prod] = {};
      if (!pivotByProduct[prod][ota]) pivotByProduct[prod][ota] = {};
      if (!pivotByProduct[prod][ota][tipo]) pivotByProduct[prod][ota][tipo] = {};
      pivotByProduct[prod][ota][tipo][mesIdx] = (pivotByProduct[prod][ota][tipo][mesIdx] || 0) + v.numeroEntradas;
    } else {
      if (!pivotSimple[ota]) pivotSimple[ota] = {};
      if (!pivotSimple[ota][tipo]) pivotSimple[ota][tipo] = {};
      pivotSimple[ota][tipo][mesIdx] = (pivotSimple[ota][tipo][mesIdx] || 0) + v.numeroEntradas;
    }
  }

  const tiposOrder = (a: string, b: string) => {
    const order = ["General", "Niño", "Reducido"];
    return order.indexOf(a) - order.indexOf(b) || a.localeCompare(b);
  };

  const rows: Row[] = [];

  if (showProductCol) {
    const productos = [...distinctProducts].sort((a, b) => {
      if (a === "General") return 1;
      if (b === "General") return -1;
      return a.localeCompare(b);
    });

    for (const prod of productos) {
      const otasEnProd = [...new Set(Object.keys(pivotByProduct[prod] || {}))].sort();
      let prodRowCount = 0;
      for (const ota of otasEnProd) {
        const tiposEnOta = Object.keys(pivotByProduct[prod]?.[ota] || {}).sort(tiposOrder);
        prodRowCount += tiposEnOta.length + 1;
      }

      let firstInProd = true;
      for (const ota of otasEnProd) {
        const tiposEnOta = Object.keys(pivotByProduct[prod]?.[ota] || {}).sort(tiposOrder);
        const otaRowCount = tiposEnOta.length + 1;
        let firstInOta = true;

        for (const tipo of tiposEnOta) {
          const valores = MES_ORDER.map((_, i) => pivotByProduct[prod]?.[ota]?.[tipo]?.[i] ?? 0);
          valores.forEach((v, i) => (totalesPorMes[i] += v));
          rows.push({
            producto: firstInProd ? prod : undefined,
            productoRowSpan: firstInProd ? prodRowCount : undefined,
            ota: firstInOta ? ota : undefined,
            otaRowSpan: firstInOta ? otaRowCount : undefined,
            tipo,
            valores,
          });
          firstInProd = false;
          firstInOta = false;
        }

        const subtotalValores = MES_ORDER.map((_, i) =>
          tiposEnOta.reduce((s, t) => s + (pivotByProduct[prod]?.[ota]?.[t]?.[i] ?? 0), 0)
        );
        rows.push({
          tipo: "Subtotal",
          isSubtotal: true,
          valores: subtotalValores,
        });
      }
    }
  } else {
    const otas = [...otasSet].sort();
    const tipos = [...tiposSet].sort(tiposOrder);

    for (const ota of otas) {
      const tiposEnOta = tipos.filter((t) => pivotSimple[ota]?.[t]);
      const otaRowCount = tiposEnOta.length + 1;
      let first = true;
      for (const tipo of tiposEnOta) {
        const valores = MES_ORDER.map((_, i) => pivotSimple[ota]?.[tipo]?.[i] ?? 0);
        valores.forEach((v, i) => (totalesPorMes[i] += v));
        rows.push({
          ota: first ? ota : undefined,
          otaRowSpan: first ? otaRowCount : undefined,
          tipo,
          valores,
        });
        first = false;
      }
      const subtotalValores = MES_ORDER.map((_, i) =>
        tiposEnOta.reduce((s, t) => s + (pivotSimple[ota]?.[t]?.[i] ?? 0), 0)
      );
      rows.push({ ota: undefined, tipo: "Subtotal", isSubtotal: true, valores: subtotalValores });
    }
  }

  rows.push({ tipo: "Total", isSubtotal: true, valores: totalesPorMes });

  if (ventas.length === 0 || rows.length <= 1) {
    return (
      <div className="px-5 py-8 text-center text-slate-500">No hay datos con los filtros seleccionados.</div>
    );
  }

  const leftCols = showProductCol ? 3 : 2;

  const exportData: string[][] = [
    showProductCol
      ? ["Producto", "OTA", "Tipo de Entrada", ...MES_ORDER.map((m) => m.replace(/^\d+\.\s*/, ""))]
      : ["OTA", "Tipo de Entrada", ...MES_ORDER.map((m) => m.replace(/^\d+\.\s*/, ""))],
  ];

  let currentProd = "";
  let currentOta = "";
  for (const row of rows) {
    if (row.producto) currentProd = row.producto;
    if (row.ota) currentOta = row.ota;
    const vals = row.valores.map((v) => (v === 0 ? "" : String(v)));
    if (showProductCol) {
      exportData.push([
        row.tipo === "Total" ? "" : row.producto ?? currentProd,
        row.tipo === "Total" ? "" : row.ota ?? currentOta,
        row.tipo,
        ...vals,
      ]);
    } else {
      exportData.push([row.tipo === "Total" ? "" : currentOta, row.tipo, ...vals]);
    }
  }

  const downloadCSV = () => {
    const csv = exportData.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumen-ventas-otas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumen Ventas");
    XLSX.writeFile(wb, "resumen-ventas-otas.xlsx");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-end">
        <button
          onClick={downloadCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />
          Descargar CSV
        </button>
        <button
          onClick={downloadExcel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />
          Descargar Excel
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              {showProductCol && (
                <th className="px-3 py-2.5 text-left font-semibold border-b border-r border-slate-700">Producto</th>
              )}
              <th className="px-3 py-2.5 text-left font-semibold border-b border-r border-slate-700">OTA</th>
              <th className="px-3 py-2.5 text-left font-semibold border-b border-r border-slate-700">Tipo de Entrada</th>
              {MES_ORDER.map((mes) => (
                <th key={mes} className="px-2 py-2.5 text-center font-semibold border-b border-r border-slate-700 min-w-[4rem]">
                  {mes.replace(/^\d+\.\s*/, "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.producto ?? ""}-${row.ota ?? ""}-${row.tipo}-${i}`}
                className={
                  row.isSubtotal
                    ? "bg-slate-300 font-semibold"
                    : i % 2 === 0
                      ? "bg-white"
                      : "bg-slate-50"
                }
              >
                {row.tipo === "Total" ? (
                  <td colSpan={leftCols} className="px-3 py-2 border-b border-r border-slate-200 text-slate-900 font-bold">
                    Total
                  </td>
                ) : (
                  <>
                    {showProductCol && (
                      <>
                        {row.productoRowSpan != null ? (
                          <td
                            rowSpan={row.productoRowSpan}
                            className="px-3 py-2 border-b border-r border-slate-200 text-slate-800 align-top font-medium"
                          >
                            {row.producto}
                          </td>
                        ) : null}
                        {row.otaRowSpan != null ? (
                          <td rowSpan={row.otaRowSpan} className="px-3 py-2 border-b border-r border-slate-200 text-slate-800 align-top">
                            {row.ota}
                          </td>
                        ) : null}
                      </>
                    )}
                    {!showProductCol && row.otaRowSpan != null ? (
                      <td rowSpan={row.otaRowSpan} className="px-3 py-2 border-b border-r border-slate-200 text-slate-800 align-top">
                        {row.ota}
                      </td>
                    ) : null}
                    <td className="px-3 py-2 border-b border-r border-slate-200 text-slate-800">{row.tipo}</td>
                  </>
                )}
                {row.valores.map((v, j) => (
                  <td key={j} className="px-2 py-2 border-b border-r border-slate-200 text-center text-slate-700">
                    {v === 0 ? "—" : v.toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
