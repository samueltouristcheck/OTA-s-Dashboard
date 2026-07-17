import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { generaPassword } from "@/lib/password";

/**
 * POST: Crea el usuario de los clientes con perfil que todavía no tengan uno.
 *
 * NO toca a los que ya funcionan: cada cliente tiene su propia contraseña y esto se la borraría.
 * Antes reescribía la de todos a "cliente123" en cada pasada, así que cambiarle la contraseña a un
 * cliente no servía de nada en cuanto alguien pulsaba el botón.
 *
 * Los nombres salen de la tabla Cliente. Antes salían de Google Sheets, y por eso a un cliente dado
 * de alta en el panel (el Museu Egipci) no le creaba nunca el usuario.
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

    const creados: string[] = [];
    let yaTenian = 0;

    for (const cliente of clientes) {
      const { data: existingUser } = await supabase
        .from("User")
        .select("id")
        .eq("clienteId", cliente.id)
        .eq("role", "client")
        .maybeSingle();

      if (existingUser) {
        yaTenian++;
        continue;
      }

      // Evitar chocar con un usuario que ya tenga ese nombre pero cuelgue de otro cliente.
      const { data: dupUsers } = await supabase
        .from("User")
        .select("id")
        .ilike("username", cliente.nombre)
        .limit(1);
      if (dupUsers?.length) continue;

      const password = generaPassword();
      await supabase.from("User").insert({
        username: cliente.nombre,
        email: cliente.nombre,
        password: await bcrypt.hash(password, 10),
        initialPassword: password,
        role: "client",
        clienteId: cliente.id,
      });
      creados.push(cliente.nombre);
    }

    const message = creados.length
      ? `${creados.length} acceso(s) creado(s): ${creados.join(", ")}. Sus contraseñas están en la pantalla de Clientes. Los ${yaTenian} que ya tenían acceso no se han tocado.`
      : `Todos los clientes (${yaTenian}) ya tienen acceso. No se ha cambiado nada.`;

    return NextResponse.json({ message, created: creados.length, sinTocar: yaTenian });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
