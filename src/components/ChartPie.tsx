"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

type DataPoint = { name: string; value: number };

export function ChartPie({ data }: { data: DataPoint[] }) {
  if (!data?.length) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>;

  const total = data.reduce((s, d) => s + d.value, 0);
  const dataWithPct = data.map((d) => ({
    ...d,
    porcentaje: total > 0 ? ((d.value / total) * 100).toFixed(1) : "0",
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dataWithPct}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, porcentaje }) => `${name} ${porcentaje}%`}
          >
            {dataWithPct.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, name: string, props: { payload: { porcentaje: string } }) => [
              `${v.toLocaleString()} (${props.payload.porcentaje}%)`,
              "Entradas",
            ]}
            cursor={false}
          />
          <Legend formatter={(value, entry: { payload?: { porcentaje: string } }) => `${value} (${entry.payload?.porcentaje ?? "0"}%)`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
