import { NextRequest, NextResponse } from "next/server";
import { verifyToken, type TokenPayload } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { supabase } from "@/lib/supabase";

function canAccessClientesApi(payload: TokenPayload) {
  return payload.role === "admin" || isSuperAdmin(payload);
}

/** Lista clientes de Supabase (admin o super admin, mismo criterio que registro de uso) */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || !canAccessClientesApi(payload)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { data, error } = await supabase.from("Cliente").select("id, nombre").order("nombre", { ascending: true });
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
    if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const { data: existing } = await supabase.from("Cliente").select("id").eq("nombre", nombre.trim()).maybeSingle();
    if (existing) return NextResponse.json(existing);
    const { data: created, error } = await supabase.from("Cliente").insert({ nombre: nombre.trim() }).select("id").single();
    if (error) throw error;
    return NextResponse.json(created);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
  }
}
