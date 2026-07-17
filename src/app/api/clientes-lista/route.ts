import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Lista de nombres de clientes, para comprobar de un vistazo qué hay en la base de datos.
 * Antes leía Google Sheets y no pedía ningún permiso: la lista de clientes quedaba abierta a
 * cualquiera que supiese la URL.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || (payload.role !== "admin" && !isSuperAdmin(payload))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("Cliente")
      .select("nombre")
      .eq("activo", true)
      .order("nombre");
    if (error) throw error;

    const clientes = (data || []).map((c) => c.nombre);
    return NextResponse.json(
      { clientes, total: clientes.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener los clientes" }, { status: 500 });
  }
}
