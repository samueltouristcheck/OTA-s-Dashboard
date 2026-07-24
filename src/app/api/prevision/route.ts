import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { resolveClienteFilter } from "@/lib/ventas-cliente";
import { fetchVentasRows } from "@/lib/ventas-db";
import { analitzaClient, type VentaDetallada } from "@/lib/prevision";
import { festiusDe } from "@/lib/festius";

export const dynamic = "force-dynamic";

/**
 * Previsió de vendes d'un client: previsió del mes següent, desglossament per OTA/producte,
 * recomanacions i % de fiabilitat.
 *
 * `resolveClienteFilter` garanteix que un museu només vegi la seva previsió, com a les vendes.
 * **L'avís de dades incompletes (`avisoDatos`) NO s'envia mai a un client**: només a admin/superadmin,
 * per al panell intern de revisió.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const cliente = await resolveClienteFilter(payload, new URL(req.url).searchParams.get("clienteId"));
    if (cliente.denyAll || !cliente.clienteId) {
      return NextResponse.json(
        { prevision: { hayDatos: false, mensaje: "No hay datos." }, desglose: { porOta: [], porProducto: [] }, recomendaciones: [] },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const rows = await fetchVentasRows(cliente.clienteId);
    const ventas: VentaDetallada[] = rows.map((v) => ({
      mes: v.mes,
      año: v.ano,
      numeroEntradas: v.numeroEntradas,
      ota: v.ota,
      producto: v.producto,
    }));

    const analisi = analitzaClient(ventas, festiusDe(2024, 2027));

    // Un client no ha de saber mai que li falten dades: fora l'avís intern.
    if (payload.role === "client") {
      delete analisi.prevision.avisoDatos;
    }

    return NextResponse.json(analisi, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al calcular la previsión" }, { status: 500 });
  }
}
