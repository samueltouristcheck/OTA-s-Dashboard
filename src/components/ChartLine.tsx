"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DataPoint = { mes: string; entradas: number };

function capitalizeMonth(s: string): string {
  const cleaned = s.replace(/^\d+\.\s*/, "").trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : s;
}

export function ChartLine({ data }: { data: DataPoint[] }) {
  const MES_ORDER = ["01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio", "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre"];
  const sorted = [...(data || [])].sort((a, b) => MES_ORDER.indexOf(a.mes) - MES_ORDER.indexOf(b.mes));
  const displayData = sorted.map((d) => ({ ...d, mesLabel: capitalizeMonth(d.mes) }));

  if (!displayData.length) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayData} margin={{ bottom: 60, right: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="mesLabel" angle={-45} tick={{ fontSize: 11, textAnchor: "end" }} interval={0} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip cursor={false} />
          <Line type="monotone" dataKey="entradas" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} name="Entradas" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
