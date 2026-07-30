import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { supabase } from "@/lib/supabase";
import { fetchVentasRows } from "@/lib/ventas-db";

export const dynamic = "force-dynamic";

/**
 * Tots els productes de tots els clients, amb l'històric d'entrades per any.
 *
 * S'agrupa per client + producte, no pel nom del producte sol: 19 clients fan servir "General", i
 * ajuntar-los seria una fila sense sentit.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || (payload.role !== "admin" && !isSuperAdmin(payload))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: clientes } = await supabase.from("Cliente").select("id, nombre");
    const nom = new Map((clientes || []).map((c) => [c.id, c.nombre]));

    const rows = await fetchVentasRows(null);

    const anys = [...new Set(rows.map((v) => v.ano))].filter(Boolean).sort();
    const acc = new Map<string, { cliente: string; producto: string; porAño: Record<number, number>; total: number }>();

    for (const v of rows) {
      const cliente = nom.get(v.clienteId) ?? "?";
      const key = `${cliente}|||${v.producto}`;
      if (!acc.has(key)) acc.set(key, { cliente, producto: v.producto, porAño: {}, total: 0 });
      const r = acc.get(key)!;
      r.porAño[v.ano] = (r.porAño[v.ano] || 0) + v.numeroEntradas;
      r.total += v.numeroEntradas;
    }

    const productos = [...acc.values()].sort(
      (a, b) => a.cliente.localeCompare(b.cliente) || b.total - a.total
    );

    return NextResponse.json({ anys, productos }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener los productos" }, { status: 500 });
  }
}
