import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
import { fetchSheetData } from "@/lib/google-sheets";
import { clienteSheetsEquiv } from "@/lib/clientes-sheet";
import { computeComparativa, parseStatsFilters, type StatsRow } from "@/lib/stats";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sheetId = process.env.GOOGLE_SHEETS_ID;
    if (!sheetId) {
      return NextResponse.json({ error: "GOOGLE_SHEETS_ID no configurado" }, { status: 400 });
    }

    const tabName = process.env.GOOGLE_SHEETS_TAB || undefined;
    const rows = await fetchSheetData(sheetId, tabName);

    const { searchParams } = new URL(req.url);
    const clienteNombre = searchParams.get("clienteId") || searchParams.get("cliente");
    const comparativa = searchParams.get("comparativa") || "";
    const filters = parseStatsFilters(searchParams);

    let rowsCliente = rows;
    if (payload.role === "client") {
      rowsCliente = payload.clienteNombre
        ? rows.filter((r) => clienteSheetsEquiv(r.cliente, payload.clienteNombre!))
        : [];
    } else if (clienteNombre) {
      rowsCliente = rows.filter((r) => clienteSheetsEquiv(r.cliente, clienteNombre));
    }

    const statsRows: StatsRow[] = rowsCliente.map((r) => ({
      ota: r.ota,
      tipoEntrada: r.tipoEntrada,
      mes: r.mes,
      año: r.año,
      numeroEntradas: r.numeroEntradas,
      producto: r.producto,
    }));

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
