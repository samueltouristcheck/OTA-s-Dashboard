import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { fetchSheetData } from "@/lib/google-sheets";

/**
 * Sincroniza clientes de Google Sheets a Supabase.
 * Crea registros en Cliente para cada nombre único.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sheetId = process.env.GOOGLE_SHEETS_ID;
    if (!sheetId) {
      return NextResponse.json({ error: "GOOGLE_SHEETS_ID no configurado" }, { status: 400 });
    }

    const tabName = process.env.GOOGLE_SHEETS_TAB || undefined;
    const rows = await fetchSheetData(sheetId, tabName);
    const nombres = [...new Set(rows.map((r) => r.cliente).filter(Boolean))].sort();

    let created = 0;
    for (const nombre of nombres) {
      const { data: existing } = await supabase.from("Cliente").select("id").eq("nombre", nombre).single();
      if (!existing) {
        await supabase.from("Cliente").insert({ nombre });
        created++;
      }
    }

    return NextResponse.json({
      total: nombres.length,
      created,
      clientes: nombres,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al sincronizar clientes" }, { status: 500 });
  }
}
