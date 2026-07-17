import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { resolveClienteFilter } from "@/lib/ventas-cliente";
import { fetchVentasRows } from "@/lib/ventas-db";
import { computeComparativa, parseStatsFilters, type StatsRow } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const comparativa = searchParams.get("comparativa") || "";
    const filters = parseStatsFilters(searchParams);
    const cliente = await resolveClienteFilter(payload, searchParams.get("clienteId"));

    let statsRows: StatsRow[] = [];
    if (!cliente.denyAll) {
      const data = await fetchVentasRows(cliente.clienteId);
      statsRows = data.map((v) => ({
        ota: v.ota,
        tipoEntrada: v.tipoEntrada,
        mes: v.mes,
        año: v.ano,
        numeroEntradas: v.numeroEntradas,
        producto: v.producto,
      }));
    }

    const result = computeComparativa(statsRows, filters, comparativa);
    if (!result) {
      return NextResponse.json({ error: "comparativa debe ser interanual o intermensual" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener comparativa" }, { status: 500 });
  }
}
