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
const MES_ORDER = ["01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio", "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre"];

function capitalizeMonth(s: string): string {
  const cleaned = s.replace(/^\d+\.\s*/, "").trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : s;
}

type MesData = { porAño: Record<number, number>; total: number };

export function ChartBarComparativaMeses({ porMes, años }: { porMes: Record<string, MesData>; años: number[] }) {
  const data = MES_ORDER.map((mes) => {
    const nombreCorto = mes.replace(/^\d+\.\s*/, "");
    const mesData = porMes[mes] ?? porMes[nombreCorto];
    const point: Record<string, string | number> = { name: capitalizeMonth(mes), mesKey: mes };
    for (const a of años) {
      point[`año${a}`] = mesData?.porAño[a] ?? 0;
    }
    return point;
  });
  if (!años.length) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 20, bottom: 60, right: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" angle={-45} tick={{ fontSize: 11, textAnchor: "end" }} interval={0} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip cursor={false} />
          <Legend />
          {años.map((a, i) => (
            <Bar
              key={a}
              dataKey={`año${a}`}
              name={String(a)}
              fill={COLORS[i % COLORS.length]}
              radius={[0, 4, 4, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
