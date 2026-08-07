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
  // Mostrem la columna de producte si n'hi ha més d'un, o si l'únic no és el genèric "General" (així,
  // filtrant per un any amb un sol producte real com "Vino catalán", no desapareix de la vista).
  const showProductCol =
    distinctProducts.size > 1 || (distinctProducts.size === 1 && !distinctProducts.has("General"));

  const totalesPorMes = MES_ORDER.map(() => 0);

  const pivotSimple: Record<string, Record<string, Record<number, number>>> = {};
  // Agrupació OTA -> Producto -> Tipo (primer l'OTA, després el producte).
  const pivotByOtaProd: Record<string, Record<string, Record<string, Record<number, number>>>> = {};

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
      if (!pivotByOtaProd[ota]) pivotByOtaProd[ota] = {};
      if (!pivotByOtaProd[ota][prod]) pivotByOtaProd[ota][prod] = {};
      if (!pivotByOtaProd[ota][prod][tipo]) pivotByOtaProd[ota][prod][tipo] = {};
      pivotByOtaProd[ota][prod][tipo][mesIdx] = (pivotByOtaProd[ota][prod][tipo][mesIdx] || 0) + v.numeroEntradas;
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
    const ordenaProductos = (a: string, b: string) => {
      if (a === "General") return 1;
      if (b === "General") return -1;
      return a.localeCompare(b);
    };
    const otas = [...otasSet].sort();

    for (const ota of otas) {
      const productosEnOta = Object.keys(pivotByOtaProd[ota] || {}).sort(ordenaProductos);
      // L'OTA abasta totes les files dels seus productes (tipus + subtotal per producte).
      let otaRowCount = 0;
      for (const prod of productosEnOta) {
        const tiposEnProd = Object.keys(pivotByOtaProd[ota]?.[prod] || {}).sort(tiposOrder);
        otaRowCount += tiposEnProd.length + 1;
      }

      let firstInOta = true;
      for (const prod of productosEnOta) {
        const tiposEnProd = Object.keys(pivotByOtaProd[ota]?.[prod] || {}).sort(tiposOrder);
        const prodRowCount = tiposEnProd.length + 1;
        let firstInProd = true;

        for (const tipo of tiposEnProd) {
          const valores = MES_ORDER.map((_, i) => pivotByOtaProd[ota]?.[prod]?.[tipo]?.[i] ?? 0);
          valores.forEach((v, i) => (totalesPorMes[i] += v));
          rows.push({
            ota: firstInOta ? ota : undefined,
            otaRowSpan: firstInOta ? otaRowCount : undefined,
            producto: firstInProd ? prod : undefined,
            productoRowSpan: firstInProd ? prodRowCount : undefined,
            tipo,
            valores,
          });
          firstInOta = false;
          firstInProd = false;
        }

        const subtotalValores = MES_ORDER.map((_, i) =>
          tiposEnProd.reduce((s, t) => s + (pivotByOtaProd[ota]?.[prod]?.[t]?.[i] ?? 0), 0)
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
      ? ["OTA", "Producto", "Tipo de Entrada", ...MES_ORDER.map((m) => m.replace(/^\d+\.\s*/, ""))]
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
        row.tipo === "Total" ? "" : row.ota ?? currentOta,
        row.tipo === "Total" ? "" : row.producto ?? currentProd,
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
              <th className="px-3 py-2.5 text-left font-semibold border-b border-r border-slate-700">OTA</th>
              {showProductCol && (
                <th className="px-3 py-2.5 text-left font-semibold border-b border-r border-slate-700">Producto</th>
              )}
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
                    {row.otaRowSpan != null ? (
                      <td rowSpan={row.otaRowSpan} className="px-3 py-2 border-b border-r border-slate-200 text-slate-800 align-top font-medium">
                        {row.ota}
                      </td>
                    ) : null}
                    {showProductCol && row.productoRowSpan != null ? (
                      <td rowSpan={row.productoRowSpan} className="px-3 py-2 border-b border-r border-slate-200 text-slate-800 align-top">
                        {row.producto}
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
