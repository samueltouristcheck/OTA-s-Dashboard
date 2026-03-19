import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isSuperAdmin } from "@/lib/super-admin";
import bcrypt from "bcryptjs";

/**
 * GET: Lista usuarios (solo super admin)
 * POST: Crear usuario (solo super admin)
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload || !isSuperAdmin(payload)) {
      return NextResponse.json({ error: "Solo el super admin puede gestionar usuarios" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("User")
      .select("id, username, email, role, clienteId, initialPassword, Cliente:clienteId(nombre)")
      .order("username");

    if (error) throw error;

    const users = (data || []).map((u: { Cliente?: { nombre: string } | { nombre: string }[]; cliente?: { nombre: string } }) => {
      const rel = u.Cliente ?? u.cliente;
      const nombre = Array.isArray(rel) ? rel[0]?.nombre : rel?.nombre;
      return { ...u, clienteNombre: nombre };
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload || !isSuperAdmin(payload)) {
      return NextResponse.json({ error: "Solo el super admin puede crear usuarios" }, { status: 401 });
    }

    const { username, password, clienteId, role } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("User")
      .insert({
        username: username.trim(),
        email: username.trim(),
        password: hashedPassword,
        initialPassword: password,
        role: role || "client",
        clienteId: clienteId || null,
      })
      .select("id, username, role, clienteId")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Ya existe un usuario con ese nombre" }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ user: data, message: "Usuario creado" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
