import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { resolveClienteFilter } from "@/lib/ventas-cliente";
import { esIdSinteticDeSheets } from "@/lib/clientes-sheet";
import { fetchVentasRows } from "@/lib/ventas-db";
import { applyStatsFilters, MES_ORDER, parseStatsFilters, type StatsRow } from "@/lib/stats";

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

    if (cliente.denyAll) return NextResponse.json([]);

    const list = await fetchVentasRows(cliente.clienteId);

    // Filtrem en memòria per compartir la lògica multi-valor amb la font de Sheets.
    const statsRows: StatsRow[] = list.map((v) => ({
      ota: v.ota,
      tipoEntrada: v.tipoEntrada,
      mes: v.mes,
      año: v.ano,
      numeroEntradas: v.numeroEntradas,
      producto: v.producto,
    }));
    const conservats = new Set(applyStatsFilters(statsRows, filters));
    const filtered = list.filter((_, i) => conservats.has(statsRows[i]));

    const clienteIds = [...new Set(filtered.map((v) => v.clienteId))];
    const { data: clientes } = await supabase.from("Cliente").select("id,nombre").in("id", clienteIds);
    const clienteMap = new Map((clientes || []).map((c: { id: string; nombre: string }) => [c.id, c]));

    const formatted = filtered.map((v) => ({
      ...v,
      anio: v.ano,
      cliente: clienteMap.get(v.clienteId) || { nombre: "" },
    }));

    formatted.sort((a, b) => {
      if (a.anio !== b.anio) return b.anio - a.anio;
      return MES_ORDER.indexOf(a.mes) - MES_ORDER.indexOf(b.mes);
    });

    return NextResponse.json(formatted);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener ventas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const body = await req.json();
    const { clienteId, ota, tipoEntrada, mes, ano, numeroEntradas, producto } = body;
    if (!clienteId || !mes || numeroEntradas == null) {
      return NextResponse.json({ error: "Cliente, mes y número de entradas requeridos" }, { status: 400 });
    }
    if (esIdSinteticDeSheets(clienteId)) {
      return NextResponse.json({ error: "Cliente no válido" }, { status: 400 });
    }
    const anoNum = parseInt(String(ano || new Date().getFullYear()), 10);
    const numEnt = parseInt(String(numeroEntradas), 10);
    if (isNaN(numEnt) || numEnt < 0) {
      return NextResponse.json({ error: "Número de entradas inválido" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("Venta")
      .insert({
        clienteId,
        ota: String(ota || "General").trim(),
        tipoEntrada: String(tipoEntrada || "General").trim(),
        mes: String(mes || "01. Enero").trim(),
        ano: anoNum,
        numeroEntradas: numEnt,
        producto: String(producto || "General").trim(),
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ...data, anio: data.ano, cliente: { nombre: "" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear la venta" }, { status: 500 });
  }
}
