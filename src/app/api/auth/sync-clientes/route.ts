import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";

/**
 * POST: Crea o actualiza el usuario de cada cliente con perfil.
 * Usuario = nombre del cliente, contraseña = cliente123 (bcrypt).
 *
 * Antes sacaba los nombres de Google Sheets, así que un cliente dado de alta en el panel (el Museu
 * Egipci, por ejemplo) no llegaba nunca a tener usuario. Ahora sale de la tabla Cliente, que es la
 * fuente desde que las ventas viven en la base de datos.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload || !isSuperAdmin(payload)) {
      return NextResponse.json({ error: "Solo el super admin puede sincronizar" }, { status: 401 });
    }

    // Solo los clientes con perfil: de Alsa y compañía se guardan las ventas, pero no entran.
    const { data: clientes, error } = await supabase
      .from("Cliente")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre");
    if (error) throw error;

    if (!clientes?.length) {
      return NextResponse.json({ message: "No hay clientes" });
    }

    const hashedPassword = await bcrypt.hash("cliente123", 10);
    let created = 0;
    let updated = 0;

    for (const cliente of clientes) {
      const { data: existingUser } = await supabase
        .from("User")
        .select("id")
        .eq("clienteId", cliente.id)
        .eq("role", "client")
        .maybeSingle();

      if (existingUser) {
        await supabase
          .from("User")
          .update({ username: cliente.nombre, email: cliente.nombre, password: hashedPassword })
          .eq("id", existingUser.id);
        updated++;
        continue;
      }

      // Evitar chocar con un usuario que ya tenga ese nombre pero cuelgue de otro cliente.
      const { data: dupUsers } = await supabase
        .from("User")
        .select("id")
        .ilike("username", cliente.nombre)
        .limit(1);
      if (dupUsers?.length) continue;

      await supabase.from("User").insert({
        username: cliente.nombre,
        email: cliente.nombre,
        password: hashedPassword,
        role: "client",
        clienteId: cliente.id,
      });
      created++;
    }

    return NextResponse.json({
      message: `Sincronizado: ${created} creados, ${updated} actualizados. Usuario = nombre del cliente, Contraseña = cliente123`,
      created,
      updated,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
