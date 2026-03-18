"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const MES_ORDER = ["01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio", "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre"];

function capitalizeMonth(s: string): string {
  const cleaned = s.replace(/^\d+\.\s*/, "").trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : s;
}

type Series = { año: number; porMes: Record<string, number> };

export function ChartLineComparativa({ series }: { series: Series[] }) {
  if (!series?.length) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>;

  const data = MES_ORDER.map((mes) => {
    const nombreCorto = mes.replace(/^\d+\.\s*/, "");
    const point: Record<string, string | number> = { mes: capitalizeMonth(mes), mesKey: mes };
    for (const s of series) {
      point[`año${s.año}`] = s.porMes[mes] ?? s.porMes[nombreCorto] ?? 0;
    }
    return point;
  });

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ bottom: 60, right: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="mes" tick={{ fontSize: 11, angle: -45, textAnchor: "end" }} interval={0} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip cursor={false} />
          <Legend />
          {series.map((s, i) => (
            <Line
              key={s.año}
              type="monotone"
              dataKey={`año${s.año}`}
              name={String(s.año)}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ fill: COLORS[i % COLORS.length] }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
