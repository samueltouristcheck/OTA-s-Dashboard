import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { resolveClienteFilter } from "@/lib/ventas-cliente";
import { fetchVentasRows } from "@/lib/ventas-db";
import { computeStats, parseStatsFilters, type StatsRow } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filters = parseStatsFilters(searchParams);
    const cliente = await resolveClienteFilter(payload, searchParams.get("clienteId"));

    if (cliente.denyAll) {
      return NextResponse.json(computeStats([], filters));
    }

    // Filtrem per client a la consulta i la resta en memòria, igual que la font de Sheets.
    const data = await fetchVentasRows(cliente.clienteId);

    const statsRows: StatsRow[] = data.map((v) => ({
      ota: v.ota,
      tipoEntrada: v.tipoEntrada,
      mes: v.mes,
      año: v.ano,
      numeroEntradas: v.numeroEntradas,
      producto: v.producto,
    }));

    return NextResponse.json(computeStats(statsRows, filters));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener stats" }, { status: 500 });
  }
}
