import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { verifyToken, type TokenPayload } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { canonicalitzaNomClient, clientSensePerfil } from "@/lib/clientes-sheet";
import { generaPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

function potDonarAlta(payload: TokenPayload) {
  return payload.role === "admin" || isSuperAdmin(payload);
}

/**
 * Alta completa d'un client: el crea, li crea l'usuari i li genera la contrasenya, tot d'un cop.
 *
 * Abans calia crear el client al panell i després anar a Usuaris a crear-li el compte; era fàcil
 * deixar-se el segon pas i que el museu no pogués entrar.
 *
 * La contrasenya es retorna una vegada perquè es pugui copiar. També es desa a `initialPassword`,
 * que és d'on la llegeix la pantalla de Clientes: és com funciona la resta de l'app.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || !potDonarAlta(payload)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { nombre, codigo, email } = await req.json();

    const nombreCanon = canonicalitzaNomClient(nombre || "");
    if (!nombreCanon) {
      return NextResponse.json({ error: "El nombre del cliente es obligatorio" }, { status: 400 });
    }
    // Sense perfil vol dir que no ha d'entrar al dashboard: no té sentit donar-li d'alta un compte.
    if (clientSensePerfil(nombreCanon)) {
      return NextResponse.json(
        { error: `"${nombreCanon}" está marcado como cliente sin perfil y no puede tener acceso.` },
        { status: 400 }
      );
    }

    const { data: yaExiste } = await supabase
      .from("Cliente")
      .select("id, nombre")
      .ilike("nombre", nombreCanon)
      .maybeSingle();
    if (yaExiste) {
      return NextResponse.json({ error: `"${yaExiste.nombre}" ya existe.` }, { status: 409 });
    }

    const { data: usuarioOcupado } = await supabase
      .from("User")
      .select("id")
      .ilike("username", nombreCanon)
      .maybeSingle();
    if (usuarioOcupado) {
      return NextResponse.json({ error: `Ya hay un usuario llamado "${nombreCanon}".` }, { status: 409 });
    }

    const { data: cliente, error: errCliente } = await supabase
      .from("Cliente")
      .insert({
        nombre: nombreCanon,
        activo: true,
        codigo: codigo ? String(codigo).trim().toUpperCase() : null,
        email: email ? String(email).trim() : null,
      })
      .select("id, nombre")
      .single();
    if (errCliente) throw errCliente;

    const password = generaPassword();
    const { error: errUser } = await supabase.from("User").insert({
      username: nombreCanon,
      email: nombreCanon,
      password: await bcrypt.hash(password, 10),
      initialPassword: password,
      role: "client",
      clienteId: cliente.id,
    });

    if (errUser) {
      // Sense usuari, el client quedaria a mitges: val més desfer-ho i que ho torni a provar.
      await supabase.from("Cliente").delete().eq("id", cliente.id);
      throw errUser;
    }

    return NextResponse.json(
      {
        id: cliente.id,
        nombre: cliente.nombre,
        username: nombreCanon,
        password,
        dashboardUrl: `/vista-cliente/${encodeURIComponent(cliente.nombre)}`,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al dar de alta el cliente" }, { status: 500 });
  }
}
