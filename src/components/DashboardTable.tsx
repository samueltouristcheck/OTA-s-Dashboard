"use client";

type Stats = {
  total: number;
  porMes: Record<string, number>;
  porOta: Record<string, number>;
  porTipo: Record<string, number>;
  porProducto: Record<string, number>;
  porAño: Record<number, number>;
};

type Props = { stats: Stats };

export function DashboardTable({ stats }: Props) {
  const años = Object.keys(stats.porAño).map(Number).sort((a, b) => b - a);
  const añoActual = años[0] || new Date().getFullYear();
  const añoAnterior = años[1] || añoActual - 1;
  const totalActual = stats.porAño[añoActual] || 0;
  const totalAnterior = stats.porAño[añoAnterior] || 0;
  const crecimiento = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100).toFixed(1) : "—";

  const MES_ORDER = ["01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio", "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre"];
  const porMesRows = MES_ORDER.filter((m) => stats.porMes[m]).map((mes) => ({
    concepto: mes.replace(/^\d+\.\s*/, ""),
    valor: stats.porMes[mes],
  }));
  const porOtaRows = Object.entries(stats.porOta).sort((a, b) => b[1] - a[1]).map(([ota, valor]) => ({ concepto: ota, valor }));
  const porTipoRows = Object.entries(stats.porTipo).sort((a, b) => b[1] - a[1]).map(([tipo, valor]) => ({ concepto: tipo, valor }));
  const porProductoRows = Object.entries(stats.porProducto).sort((a, b) => b[1] - a[1]).map(([prod, valor]) => ({ concepto: prod, valor }));

  return (
    <div className="space-y-6">
      <h3 className="font-medium text-slate-800">Dashboard en tabla</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Concepto</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100 bg-white">
              <td className="px-4 py-3 font-medium">Total entradas</td>
              <td className="px-4 py-3 text-right font-mono">{stats.total.toLocaleString()}</td>
            </tr>
            <tr className="border-t border-slate-100 bg-white">
              <td className="px-4 py-3 font-medium">Año {añoActual}</td>
              <td className="px-4 py-3 text-right font-mono">{totalActual.toLocaleString()}</td>
            </tr>
            <tr className="border-t border-slate-100 bg-white">
              <td className="px-4 py-3 font-medium">Crecimiento YoY (%)</td>
              <td className="px-4 py-3 text-right font-mono">{crecimiento}%</td>
            </tr>
            <tr className="border-t border-slate-100 bg-white">
              <td className="px-4 py-3 font-medium">Año anterior ({añoAnterior})</td>
              <td className="px-4 py-3 text-right font-mono">{totalAnterior.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {porOtaRows.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-2">Por OTA</h4>
          <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">OTA</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Entradas</th>
              </tr>
            </thead>
            <tbody>
              {porOtaRows.map((r) => (
                <tr key={r.concepto} className="border-t border-slate-100">
                  <td className="px-4 py-2">{r.concepto}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.valor.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {porMesRows.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-2">Por mes</h4>
          <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Mes</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Entradas</th>
              </tr>
            </thead>
            <tbody>
              {porMesRows.map((r) => (
                <tr key={r.concepto} className="border-t border-slate-100">
                  <td className="px-4 py-2">{r.concepto}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.valor.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {porTipoRows.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-2">Por tipo de entrada</h4>
          <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Tipo</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Entradas</th>
              </tr>
            </thead>
            <tbody>
              {porTipoRows.map((r) => (
                <tr key={r.concepto} className="border-t border-slate-100">
                  <td className="px-4 py-2">{r.concepto}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.valor.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {porProductoRows.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-2">Por producto</h4>
          <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Producto</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Entradas</th>
              </tr>
            </thead>
            <tbody>
              {porProductoRows.map((r) => (
                <tr key={r.concepto} className="border-t border-slate-100">
                  <td className="px-4 py-2">{r.concepto}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.valor.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
