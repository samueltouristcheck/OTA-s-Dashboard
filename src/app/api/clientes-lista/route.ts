import { NextResponse } from "next/server";
import { fetchSheetData } from "@/lib/google-sheets";

/**
 * Devuelve la lista de clientes de Google Sheets.
 * Abre en el navegador: http://localhost:3000/api/clientes-lista
 */
export async function GET() {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    if (!sheetId) {
      return NextResponse.json({ error: "GOOGLE_SHEETS_ID no configurado" }, { status: 400 });
    }

    const tabName = process.env.GOOGLE_SHEETS_TAB || undefined;
    const rows = await fetchSheetData(sheetId, tabName);
    const clientes = [...new Set(rows.map((r) => r.cliente).filter(Boolean))].sort();

    return NextResponse.json({ clientes, total: clientes.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al leer Google Sheets" }, { status: 500 });
  }
}
