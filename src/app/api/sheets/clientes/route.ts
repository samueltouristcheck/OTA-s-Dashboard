import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { fetchSheetData } from "@/lib/google-sheets";

export async function GET(req: Request) {
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

    const nombres = [...new Set(rows.map((r) => r.cliente).filter(Boolean))].sort();

    const clientes = nombres.map((nombre, i) => ({
      id: `cliente-${i}`,
      nombre,
    }));

    return NextResponse.json(clientes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener clientes de Google Sheets" }, { status: 500 });
  }
}
