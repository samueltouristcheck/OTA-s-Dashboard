import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { supabase } from "@/lib/supabase";
import { fetchVentasRows } from "@/lib/ventas-db";
import { analitzaClient, type VentaDetallada } from "@/lib/prevision";
import { festiusDe } from "@/lib/festius";

export const dynamic = "force-dynamic";

/**
 * Estat de la previsió de tots els clients, per al panell de revisió del superadmin.
 * Marca quins cal repassar: dades que semblen incompletes o sense històric.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || !isSuperAdmin(payload)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: clientes, error } = await supabase
      .from("Cliente")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre");
    if (error) throw error;

    const festius = festiusDe(2024, 2027);
    const out = [];

    for (const c of clientes || []) {
      const rows = await fetchVentasRows(c.id);
      const ventas: VentaDetallada[] = rows.map((v) => ({
        mes: v.mes,
        año: v.ano,
        numeroEntradas: v.numeroEntradas,
        ota: v.ota,
        producto: v.producto,
      }));
      const { prevision } = analitzaClient(ventas, festius);

      const estado = !prevision.hayDatos ? "sin_datos" : prevision.avisoDatos ? "revisar" : "ok";
      out.push({
        id: c.id,
        nombre: c.nombre,
        estado,
        aviso: prevision.avisoDatos ?? null,
        central: prevision.hayDatos ? prevision.central : null,
        mesNombre: prevision.hayDatos ? prevision.mesNombre : null,
        año: prevision.hayDatos ? prevision.año : null,
        fiabilidad: prevision.hayDatos ? prevision.fiabilidad.porcentaje : null,
      });
    }

    // Els que cal revisar, primer.
    const ordre = { revisar: 0, sin_datos: 1, ok: 2 } as const;
    out.sort((a, b) => ordre[a.estado as keyof typeof ordre] - ordre[b.estado as keyof typeof ordre] || a.nombre.localeCompare(b.nombre));

    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al revisar las previsiones" }, { status: 500 });
  }
}
