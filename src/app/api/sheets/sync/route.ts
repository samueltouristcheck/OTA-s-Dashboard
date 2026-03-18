import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { fetchSheetData } from "@/lib/google-sheets";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sheetId = process.env.GOOGLE_SHEETS_ID;
    if (!sheetId) {
      return NextResponse.json(
        { error: "GOOGLE_SHEETS_ID no configurado en .env" },
        { status: 400 }
      );
    }

    const tabName = process.env.GOOGLE_SHEETS_TAB || undefined;
    const rows = await fetchSheetData(sheetId, tabName);
    const clientesMap = new Map<string, string>();
    let imported = 0;

    for (const row of rows) {
      let clienteId = clientesMap.get(row.cliente);
      if (!clienteId) {
        const { data: existing } = await supabase.from("Cliente").select("id").eq("nombre", row.cliente).single();
        if (existing) {
          clienteId = existing.id;
        } else {
          const { data: created, error } = await supabase.from("Cliente").insert({ nombre: row.cliente }).select("id").single();
          if (error) throw error;
          clienteId = created!.id;
        }
        clientesMap.set(row.cliente, clienteId);
      }

      const { error } = await supabase.from("Venta").insert({
        clienteId,
        ota: row.ota,
        tipoEntrada: row.tipoEntrada,
        mes: row.mes,
        ano: row.año,
        numeroEntradas: row.numeroEntradas,
        producto: row.producto,
      });
      if (error) throw error;
      imported++;
    }

    return NextResponse.json({
      imported,
      message: `Importadas ${imported} ventas desde Google Sheets`,
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Error al sincronizar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
