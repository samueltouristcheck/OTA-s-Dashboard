"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DataPoint = { name: string; entradas: number };

export function ChartBar({ data }: { data: DataPoint[] }) {
  if (!data?.length) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>;
  const sorted = [...data].sort((a, b) => b.entradas - a.entradas);
  const chartHeight = Math.max(256, Math.min(480, sorted.length * 32));
  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
          <Tooltip cursor={false} />
          <Bar dataKey="entradas" fill="#10b981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
