import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { supabase } from "@/lib/supabase";
import { fetchVentasRows } from "@/lib/ventas-db";

export const dynamic = "force-dynamic";

/**
 * Tots els productes de tots els clients, amb l'històric d'entrades per any, al detall de cada OTA i
 * tipus d'entrada. La pantalla filtra i agrupa a partir d'aquí.
 *
 * S'agrupa per client + producte + OTA + tipus (no pel nom del producte sol: 19 clients fan servir
 * "General").
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

    type Fila = {
      cliente: string;
      producto: string;
      ota: string;
      tipoEntrada: string;
      porAño: Record<number, number>;
      total: number;
    };
    const acc = new Map<string, Fila>();

    for (const v of rows) {
      const cliente = nom.get(v.clienteId) ?? "?";
      const key = `${cliente}|||${v.producto}|||${v.ota}|||${v.tipoEntrada}`;
      if (!acc.has(key)) {
        acc.set(key, { cliente, producto: v.producto, ota: v.ota, tipoEntrada: v.tipoEntrada, porAño: {}, total: 0 });
      }
      const r = acc.get(key)!;
      r.porAño[v.ano] = (r.porAño[v.ano] || 0) + v.numeroEntradas;
      r.total += v.numeroEntradas;
    }

    const productos = [...acc.values()];

    // Opcions per als desplegables de filtre.
    const filtros = {
      clientes: [...new Set(productos.map((p) => p.cliente))].sort(),
      otas: [...new Set(productos.map((p) => p.ota).filter(Boolean))].sort(),
      tipos: [...new Set(productos.map((p) => p.tipoEntrada).filter(Boolean))].sort(),
    };

    return NextResponse.json({ anys, productos, filtros }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener los productos" }, { status: 500 });
  }
}
