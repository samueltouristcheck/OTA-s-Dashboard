import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { fetchSheetData } from "@/lib/google-sheets";

/**
 * POST /api/auth/setup
 * Arregla TODOS los usuarios: admin y clientes.
 * Sin auth. Usuario = nombre del cliente, contraseña = cliente123
 */
export async function POST() {
  try {
    const hashedCliente = await bcrypt.hash("cliente123", 10);

    // 1. Super admins: Alexandra y Samuel
    const superAdmins = [
      { id: "user-alexandra", username: "Alexandra", email: "alexandra@ota.com", password: "Alexandra123" },
      { id: "user-samuel", username: "Samuel", email: "samuel@ota.com", password: "Samuel123" },
    ];
    for (const admin of superAdmins) {
      const hashed = await bcrypt.hash(admin.password, 10);
      const { data: existing } = await supabase
        .from("User")
        .select("id")
        .ilike("username", admin.username)
        .maybeSingle();
      if (existing) {
        await supabase.from("User").update({ password: hashed }).eq("id", existing.id);
      } else {
        await supabase.from("User").insert({
          id: admin.id,
          username: admin.username,
          email: admin.email,
          password: hashed,
          role: "admin",
          clienteId: null,
        });
      }
    }

    // 2. Recolectar nombres de clientes: Supabase + Google Sheets (si está configurado)
    const nombresSet = new Set<string>();
    const { data: clientesSupabase } = await supabase.from("Cliente").select("id, nombre");
    for (const c of clientesSupabase || []) {
      if (c.nombre?.trim()) nombresSet.add(c.nombre.trim());
    }
    try {
      const sheetId = process.env.GOOGLE_SHEETS_ID;
      if (sheetId) {
        const rows = await fetchSheetData(sheetId, process.env.GOOGLE_SHEETS_TAB || undefined);
        for (const r of rows) if (r.cliente?.trim()) nombresSet.add(r.cliente.trim());
      }
    } catch {
      // Sheets no configurado o error, ignorar
    }

    let created = 0;
    let updated = 0;

    for (const nombre of nombresSet) {
      // Obtener o crear Cliente
      let clienteId: string | null = null;
      const { data: clMatch } = await supabase
        .from("Cliente")
        .select("id")
        .ilike("nombre", nombre)
        .limit(1);
      if (clMatch?.[0]) {
        clienteId = clMatch[0].id;
      } else {
        const { data: newCl } = await supabase.from("Cliente").insert({ nombre }).select("id").single();
        if (newCl) clienteId = newCl.id;
      }
      if (!clienteId) continue;

      const userData = {
        username: nombre,
        email: nombre,
        password: hashedCliente,
        role: "client" as const,
        clienteId,
      };

      const { data: existingUser } = await supabase
        .from("User")
        .select("id")
        .eq("clienteId", clienteId)
        .eq("role", "client")
        .maybeSingle();

      if (existingUser) {
        await supabase.from("User").update(userData).eq("id", existingUser.id);
        updated++;
      } else {
        const { data: dup } = await supabase.from("User").select("id").ilike("username", nombre).limit(1);
        if (dup?.length) {
          await supabase.from("User").update(userData).eq("id", dup[0].id);
          updated++;
        } else {
          await supabase.from("User").insert(userData);
          created++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Listo. Super admins: Alexandra, Samuel. Clientes: usuario = nombre, contraseña = cliente123 (${created} creados, ${updated} actualizados)`,
      created,
      updated,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
