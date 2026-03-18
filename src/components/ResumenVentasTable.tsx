"use client";

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

function matchMes(mes: string): number {
  const norm = String(mes || "").replace(/^\d+\.\s*/, "").trim().toLowerCase();
  const idx = MESES_NOMBRES.indexOf(norm);
  return idx >= 0 ? idx : -1;
}

export function ResumenVentasTable({ ventas }: { ventas: Venta[] }) {
  // Agrupar: OTA -> tipoEntrada -> mes -> suma
  const pivot: Record<string, Record<string, Record<number, number>>> = {};
  const otasSet = new Set<string>();
  const tiposSet = new Set<string>();

  for (const v of ventas) {
    const ota = v.ota?.trim() || "—";
    const tipo = v.tipoEntrada?.trim() || "General";
    const mesIdx = matchMes(v.mes);
    if (mesIdx < 0) continue;

    otasSet.add(ota);
    tiposSet.add(tipo);
    if (!pivot[ota]) pivot[ota] = {};
    if (!pivot[ota][tipo]) pivot[ota][tipo] = {};
    pivot[ota][tipo][mesIdx] = (pivot[ota][tipo][mesIdx] || 0) + v.numeroEntradas;
  }

  const otas = [...otasSet].sort();
  const tipos = [...tiposSet].sort((a, b) => {
    const order = ["General", "Niño", "Reducido"];
    return order.indexOf(a) - order.indexOf(b) || a.localeCompare(b);
  });

  const totalesPorMes = MES_ORDER.map(() => 0);

  type Row = { ota?: string; tipo: string; isSubtotal?: boolean; valores: number[]; otaRowSpan?: number };
  const rows: Row[] = [];
  for (const ota of otas) {
    const tiposEnOta = tipos.filter((t) => pivot[ota]?.[t]);
    const otaRowCount = tiposEnOta.length + 1;
    let first = true;
    for (const tipo of tiposEnOta) {
      const valores = MES_ORDER.map((_, i) => pivot[ota]?.[tipo]?.[i] ?? 0);
      valores.forEach((v, i) => (totalesPorMes[i] += v));
      rows.push({
        ota: first ? ota : undefined,
        tipo,
        valores,
        otaRowSpan: first ? otaRowCount : undefined,
      });
      first = false;
    }
    const subtotalValores = MES_ORDER.map((_, i) =>
      tiposEnOta.reduce((s, t) => s + (pivot[ota]?.[t]?.[i] ?? 0), 0)
    );
    rows.push({ ota: undefined, tipo: "Subtotal", isSubtotal: true, valores: subtotalValores });
  }
  rows.push({ tipo: "Total", isSubtotal: true, valores: totalesPorMes });

  if (ventas.length === 0 || rows.length <= 1) {
    return (
      <div className="px-5 py-8 text-center text-slate-500">No hay datos con los filtros seleccionados.</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-900 text-white">
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
              key={`${row.ota ?? ""}-${row.tipo}-${i}`}
              className={
                row.isSubtotal
                  ? "bg-slate-300 font-semibold"
                  : i % 2 === 0
                    ? "bg-white"
                    : "bg-slate-50"
              }
            >
              {row.tipo === "Total" ? (
                <td colSpan={2} className="px-3 py-2 border-b border-r border-slate-200 text-slate-900 font-bold">
                  Total
                </td>
              ) : (
                <>
                  {row.otaRowSpan != null ? (
                    <td rowSpan={row.otaRowSpan} className="px-3 py-2 border-b border-r border-slate-200 text-slate-800 align-top">
                      {row.ota}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 border-b border-r border-slate-200 text-slate-800">
                    {row.tipo}
                  </td>
                </>
              )}
              {row.valores.map((v, j) => (
                <td
                  key={j}
                  className="px-2 py-2 border-b border-r border-slate-200 text-center text-slate-700"
                >
                  {v === 0 ? "—" : v.toLocaleString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
