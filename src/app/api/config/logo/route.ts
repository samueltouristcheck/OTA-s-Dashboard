import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/** GET: Obtiene el logo del cliente del usuario actual */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload?.clienteId) {
      return NextResponse.json({ logoUrl: null });
    }
    const { data, error } = await supabase
      .from("Cliente")
      .select("logoUrl")
      .eq("id", payload.clienteId)
      .maybeSingle();
    if (error) {
      console.warn("[logo GET] Supabase error:", error.message);
      return NextResponse.json({ logoUrl: null });
    }
    return NextResponse.json({ logoUrl: data?.logoUrl ?? null });
  } catch (e) {
    console.warn("[logo GET] Error:", e);
    return NextResponse.json({ logoUrl: null });
  }
}

/** PUT: Actualiza el logo del cliente (solo el propio cliente) */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== "client" || !payload.clienteId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { logoUrl } = await req.json();
    const url = typeof logoUrl === "string" ? logoUrl.trim() || null : null;
    const { error } = await supabase
      .from("Cliente")
      .update({ logoUrl: url })
      .eq("id", payload.clienteId);
    if (error) {
      console.error("[logo PUT] Supabase error:", error);
      if (error.message?.includes("logoUrl") || error.code === "42703") {
        return NextResponse.json(
          { error: "Falta la columna logoUrl en Supabase. Ejecuta: ALTER TABLE \"Cliente\" ADD COLUMN IF NOT EXISTS \"logoUrl\" TEXT;" },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, logoUrl: url });
  } catch (e) {
    console.error("[logo PUT] Error:", e);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
