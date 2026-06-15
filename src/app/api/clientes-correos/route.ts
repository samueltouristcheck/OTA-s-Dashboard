import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function authSuperAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const payload = token ? verifyToken(token) : null;
  return payload && isSuperAdmin(payload) ? payload : null;
}

/** Lista clientes con su email de contacto. */
export async function GET(req: NextRequest) {
  if (!authSuperAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await supabase
    .from("Cliente")
    .select("id, nombre, email")
    .order("nombre", { ascending: true });
  if (error) {
    console.error("[clientes-correos]", error);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
  return NextResponse.json(data || []);
}

/** Actualiza el email de un cliente. Body: { id, email }. */
export async function PUT(req: NextRequest) {
  if (!authSuperAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, email } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  const value = typeof email === "string" ? email.trim() || null : null;
  const { error } = await supabase.from("Cliente").update({ email: value }).eq("id", id);
  if (error) {
    console.error("[clientes-correos] update", error);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
