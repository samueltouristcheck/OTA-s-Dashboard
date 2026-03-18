import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { fetchSheetData } from "@/lib/google-sheets";

const SUPER_ADMIN = "admin@2ota.com";

function isSuperAdmin(payload: { email?: string } | null): boolean {
  return !!payload && payload.email === SUPER_ADMIN;
}

/**
 * POST: Sincroniza usuarios cliente desde Google Sheets.
 * Crea/actualiza usuarios con username=nombre del cliente y password=cliente123 (bcrypt).
 * Solo super admin. Útil cuando los clientes vienen de Sheets y el login falla.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload || !isSuperAdmin(payload)) {
      return NextResponse.json({ error: "Solo el super admin puede sincronizar" }, { status: 401 });
    }

    const sheetId = process.env.GOOGLE_SHEETS_ID;
    if (!sheetId) {
      return NextResponse.json({ error: "GOOGLE_SHEETS_ID no configurado" }, { status: 400 });
    }

    const tabName = process.env.GOOGLE_SHEETS_TAB || undefined;
    const rows = await fetchSheetData(sheetId, tabName);
    const nombres = [...new Set(rows.map((r) => r.cliente).filter(Boolean))].filter(Boolean) as string[];

    if (!nombres.length) {
      return NextResponse.json({ message: "No hay clientes en la hoja" });
    }

    const hashedPassword = await bcrypt.hash("cliente123", 10);
    let created = 0;
    let updated = 0;

    for (const nombre of nombres) {
      const nombreTrim = nombre.trim();
      if (!nombreTrim) continue;

      // Obtener o crear Cliente en Supabase
      let clienteId: string | null = null;
      const { data: clientesMatch } = await supabase
        .from("Cliente")
        .select("id")
        .ilike("nombre", nombreTrim)
        .limit(1);
      const existingCliente = clientesMatch?.[0];

      if (existingCliente) {
        clienteId = existingCliente.id;
      } else {
        const { data: newCliente, error: insertErr } = await supabase
          .from("Cliente")
          .insert({ nombre: nombreTrim })
          .select("id")
          .single();
        if (!insertErr && newCliente) clienteId = newCliente.id;
      }

      if (!clienteId) continue;

      // Buscar usuario existente por clienteId
      const { data: existingUser } = await supabase
        .from("User")
        .select("id, username")
        .eq("clienteId", clienteId)
        .eq("role", "client")
        .maybeSingle();

      if (existingUser) {
        await supabase
          .from("User")
          .update({
            username: nombreTrim,
            email: nombreTrim,
            password: hashedPassword,
          })
          .eq("id", existingUser.id);
        updated++;
      } else {
        // Verificar si ya existe usuario con ese username (evitar duplicados)
        const { data: dupUsers } = await supabase
          .from("User")
          .select("id")
          .ilike("username", nombreTrim)
          .limit(1);

        if (!dupUsers?.length) {
          await supabase.from("User").insert({
            username: nombreTrim,
            email: nombreTrim,
            password: hashedPassword,
            role: "client",
            clienteId,
          });
          created++;
        }
      }
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
