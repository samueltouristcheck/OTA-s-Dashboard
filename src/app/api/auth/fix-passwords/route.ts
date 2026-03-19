import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";

/**
 * POST: Fuerza el restablecimiento de TODAS las contraseñas de clientes a cliente123 (bcrypt).
 * Solo super admin. Usar cuando el login sigue fallando después de sincronizar.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload || !isSuperAdmin(payload)) {
      return NextResponse.json({ error: "Solo el super admin puede ejecutar esto" }, { status: 401 });
    }

    const hashedPassword = await bcrypt.hash("cliente123", 10);

    const { data: clientUsers, error: fetchErr } = await supabase
      .from("User")
      .select("id, username")
      .eq("role", "client");

    if (fetchErr) throw fetchErr;

    let updated = 0;
    for (const u of clientUsers || []) {
      const { error: updateErr } = await supabase
        .from("User")
        .update({ password: hashedPassword })
        .eq("id", u.id);
      if (!updateErr) updated++;
    }

    return NextResponse.json({
      message: `${updated} usuarios cliente actualizados. Contraseña = cliente123`,
      updated,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
