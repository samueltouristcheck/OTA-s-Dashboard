import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

/**
 * POST: El usuario cambia su propia contraseña.
 * Body: { currentPassword, newPassword }
 * Actualiza password (bcrypt) e initialPassword para que el super admin vea la nueva en el panel.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword?.trim()) {
      return NextResponse.json(
        { error: "Contraseña actual y nueva requeridas" },
        { status: 400 }
      );
    }

    if (newPassword.trim().length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const { data: user, error: fetchErr } = await supabase
      .from("User")
      .select("id, password")
      .eq("id", payload.userId)
      .single();

    if (fetchErr || !user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const valid = await bcrypt.compare(String(currentPassword).trim(), user.password);
    if (!valid) {
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    const { error: updateErr } = await supabase
      .from("User")
      .update({
        password: hashedPassword,
        initialPassword: newPassword.trim(),
      })
      .eq("id", payload.userId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ message: "Contraseña actualizada correctamente" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al cambiar contraseña" }, { status: 500 });
  }
}
