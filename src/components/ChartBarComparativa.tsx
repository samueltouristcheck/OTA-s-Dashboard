"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

type Series = { año: number; porOta: Record<string, number> };

export function ChartBarComparativa({ series }: { series: Series[] }) {
  if (!series?.length) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>;

  const otas = [...new Set(series.flatMap((s) => Object.keys(s.porOta)))].sort();

  const data = otas.map((ota) => {
    const point: Record<string, string | number> = { name: ota };
    for (const s of series) {
      point[`año${s.año}`] = s.porOta[ota] || 0;
    }
    return point;
  });

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip cursor={false} />
          <Legend />
          {series.map((s, i) => (
            <Bar
              key={s.año}
              dataKey={`año${s.año}`}
              name={String(s.año)}
              fill={COLORS[i % COLORS.length]}
              radius={[0, 4, 4, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
