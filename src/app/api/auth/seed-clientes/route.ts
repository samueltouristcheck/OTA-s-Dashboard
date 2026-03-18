import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

/**
 * POST: Actualiza usuarios cliente con usuario=nombre y contraseña=cliente123
 * Usa bcryptjs para el hash (compatible con el login).
 */
export async function POST() {
  try {
    const hashedPassword = await bcrypt.hash("cliente123", 10);

    const { data: clientes } = await supabase.from("Cliente").select("id, nombre");
    if (!clientes?.length) {
      return NextResponse.json({ message: "No hay clientes en Supabase" });
    }

    for (const c of clientes) {
      const { data: users } = await supabase
        .from("User")
        .select("id")
        .eq("clienteId", c.id)
        .eq("role", "client");

      if (users?.length) {
        for (const u of users) {
          await supabase
            .from("User")
            .update({
              username: c.nombre,
              email: c.nombre,
              password: hashedPassword,
            })
            .eq("id", u.id);
        }
      } else {
        await supabase.from("User").insert({
          username: c.nombre,
          email: c.nombre,
          password: hashedPassword,
          role: "client",
          clienteId: c.id,
        });
      }
    }

    return NextResponse.json({
      message: "Clientes actualizados. Usuario = nombre del cliente, Contraseña = cliente123",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
