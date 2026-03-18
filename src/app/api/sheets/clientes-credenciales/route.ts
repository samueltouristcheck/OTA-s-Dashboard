import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { fetchSheetData } from "@/lib/google-sheets";
import { supabase } from "@/lib/supabase";

/** Lista clientes de Sheets con sus credenciales reales (Supabase) */
export async function GET(req: Request) {
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
    const nombresSheet = [...new Set(rows.map((r) => r.cliente).filter(Boolean))].sort();

    const { data: users } = await supabase
      .from("User")
      .select("username, initialPassword, Cliente:clienteId(nombre)")
      .eq("role", "client");

    const userByCliente: Record<string, { username: string; password: string }> = {};
    for (const u of users || []) {
      const clienteNombre = Array.isArray(u.Cliente) ? u.Cliente[0]?.nombre : (u.Cliente as { nombre?: string })?.nombre;
      if (clienteNombre) {
        userByCliente[clienteNombre.toLowerCase()] = {
          username: u.username,
          password: u.initialPassword || "—",
        };
      }
    }

    const clientes = nombresSheet.map((nombre, i) => {
      const cred = userByCliente[nombre.toLowerCase()];
      return {
        id: `cliente-${i}`,
        nombre,
        username: cred?.username ?? "—",
        password: cred?.password ?? "—",
        hasUser: !!cred,
      };
    });

    return NextResponse.json(clientes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}
