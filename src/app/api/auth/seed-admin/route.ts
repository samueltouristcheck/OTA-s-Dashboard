import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

/**
 * POST: Crea el usuario admin@2ota.com con contraseña admin123
 * Usa bcryptjs para el hash (compatible con el login).
 * Ejecutar una vez si el login falla por hash incompatible.
 */
export async function POST() {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    await supabase.from("User").delete().eq("id", "user-admin");

    const { error } = await supabase.from("User").insert({
      id: "user-admin",
      username: "admin@2ota.com",
      email: "admin@2ota.com",
      password: hashedPassword,
      role: "admin",
      clienteId: null,
    });

    if (error) throw error;

    return NextResponse.json({ message: "Admin creado. Usuario: admin@2ota.com, Contraseña: admin123" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
