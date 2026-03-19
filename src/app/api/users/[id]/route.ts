import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isSuperAdmin } from "@/lib/super-admin";
import bcrypt from "bcryptjs";

/** PATCH: Editar usuario (solo super admin) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload || !isSuperAdmin(payload)) {
      return NextResponse.json({ error: "Solo el super admin puede editar usuarios" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.username != null) updates.username = String(body.username).trim();
    if (body.email != null) updates.email = String(body.email).trim();
    if (body.role != null) updates.role = body.role;
    if (body.clienteId != null) updates.clienteId = body.clienteId || null;

    if (body.password && body.password.trim()) {
      updates.password = await bcrypt.hash(body.password, 10);
      updates.initialPassword = body.password;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("User")
      .update(updates)
      .eq("id", id)
      .select("id, username, role, clienteId")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Ya existe un usuario con ese nombre" }, { status: 400 });
      throw error;
    }

    return NextResponse.json({ user: data, message: "Usuario actualizado" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}

/** DELETE: Eliminar usuario (solo super admin). No puede eliminarse a sí mismo. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload || !isSuperAdmin(payload)) {
      return NextResponse.json({ error: "Solo el super admin puede eliminar usuarios" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (payload.userId === id) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
    }

    const { error } = await supabase.from("User").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Usuario eliminado" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });
  }
}
