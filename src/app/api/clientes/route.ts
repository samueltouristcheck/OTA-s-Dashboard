import { NextRequest, NextResponse } from "next/server";
import { verifyToken, type TokenPayload } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { canonicalitzaNomClient, clientSensePerfil } from "@/lib/clientes-sheet";
import { supabase } from "@/lib/supabase";

function canAccessClientesApi(payload: TokenPayload) {
  return payload.role === "admin" || isSuperAdmin(payload);
}

/**
 * Lista clientes de Supabase (admin o super admin, mismo criterio que registro de uso).
 * Por defecto solo los que tienen perfil: de Alsa, Fundació Miró, Castell d'Hostalric y Museu de
 * l'Art Prohibit se guardan las ventas, pero no salen como cliente. Con ?inactivos=1 salen todos.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || !canAccessClientesApi(payload)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const incluirInactivos = new URL(req.url).searchParams.get("inactivos") === "1";
    let query = supabase.from("Cliente").select("id, nombre").order("nombre", { ascending: true });
    if (!incluirInactivos) query = query.eq("activo", true);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}

/** Crea o obtiene cliente por nombre (admin o super admin) */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || !canAccessClientesApi(payload)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { nombre } = await req.json();
    // Nombre canónico: si no, "VINSEUM" y "Vinseum" volverían a entrar como dos clientes.
    const nombreCanon = canonicalitzaNomClient(nombre || "");
    if (!nombreCanon) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const { data: existing } = await supabase.from("Cliente").select("id").ilike("nombre", nombreCanon).maybeSingle();
    if (existing) return NextResponse.json(existing);
    const { data: created, error } = await supabase
      .from("Cliente")
      .insert({ nombre: nombreCanon, activo: !clientSensePerfil(nombreCanon) })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json(created);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
  }
}
