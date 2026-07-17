import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { esIdSinteticDeSheets } from "@/lib/clientes-sheet";
import { MES_ORDER } from "@/lib/stats";

export const dynamic = "force-dynamic";

/** Una cel·la de la graella. numeroEntradas a null vol dir esborrar-la. */
type Canvi = {
  ota: string;
  tipoEntrada: string;
  producto: string;
  mes: string;
  numeroEntradas: number | null;
};

/**
 * Desa la graella de dades mensuals. Treballa amb la clau natural
 * (cliente, OTA, tipus, producte, mes, any) i no amb l'id de la fila, perquè la graella no sap si una
 * cel·la ja existeix a la base de dades o no.
 */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { clienteId, ano, cambios } = (await req.json()) as {
      clienteId?: string;
      ano?: number;
      cambios?: Canvi[];
    };

    if (!clienteId || esIdSinteticDeSheets(clienteId)) {
      return NextResponse.json({ error: "Cliente no válido" }, { status: 400 });
    }
    const anoNum = parseInt(String(ano), 10);
    if (isNaN(anoNum)) {
      return NextResponse.json({ error: "Año no válido" }, { status: 400 });
    }
    if (!Array.isArray(cambios) || !cambios.length) {
      return NextResponse.json({ guardadas: 0, borradas: 0 });
    }

    const { data: cliente } = await supabase.from("Cliente").select("id").eq("id", clienteId).maybeSingle();
    if (!cliente) {
      return NextResponse.json({ error: "El cliente no existe" }, { status: 400 });
    }

    const aEscriure: Array<Record<string, unknown>> = [];
    const aEsborrar: Canvi[] = [];

    for (const c of cambios) {
      const ota = String(c.ota ?? "").trim();
      const tipoEntrada = String(c.tipoEntrada ?? "").trim();
      const producto = String(c.producto ?? "").trim();
      const mes = String(c.mes ?? "").trim();

      if (!ota || !tipoEntrada || !producto) {
        return NextResponse.json({ error: "OTA, tipo y producto son obligatorios" }, { status: 400 });
      }
      if (!MES_ORDER.includes(mes)) {
        return NextResponse.json({ error: `Mes no válido: ${mes}` }, { status: 400 });
      }

      if (c.numeroEntradas === null || c.numeroEntradas === undefined) {
        aEsborrar.push({ ota, tipoEntrada, producto, mes, numeroEntradas: null });
        continue;
      }
      const n = Number(c.numeroEntradas);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ error: "Número de entradas no válido" }, { status: 400 });
      }
      aEscriure.push({ clienteId, ota, tipoEntrada, producto, mes, ano: anoNum, numeroEntradas: n });
    }

    const LOT = 500;
    for (let i = 0; i < aEscriure.length; i += LOT) {
      const { error } = await supabase
        .from("Venta")
        .upsert(aEscriure.slice(i, i + LOT), { onConflict: "clienteId,ota,tipoEntrada,producto,mes,ano" });
      if (error) throw error;
    }

    for (const c of aEsborrar) {
      const { error } = await supabase.from("Venta").delete().match({
        clienteId,
        ota: c.ota,
        tipoEntrada: c.tipoEntrada,
        producto: c.producto,
        mes: c.mes,
        ano: anoNum,
      });
      if (error) throw error;
    }

    return NextResponse.json({ guardadas: aEscriure.length, borradas: aEsborrar.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}

/** Esborra una fila sencera de la graella (els 12 mesos d'una combinació). */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("clienteId");
    const ano = parseInt(String(searchParams.get("ano")), 10);
    const ota = searchParams.get("ota");
    const tipoEntrada = searchParams.get("tipoEntrada");
    const producto = searchParams.get("producto");

    if (!clienteId || isNaN(ano) || !ota || !tipoEntrada || !producto) {
      return NextResponse.json({ error: "Faltan datos para borrar la fila" }, { status: 400 });
    }

    const { error } = await supabase
      .from("Venta")
      .delete()
      .match({ clienteId, ota, tipoEntrada, producto, ano });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al borrar la fila" }, { status: 500 });
  }
}
