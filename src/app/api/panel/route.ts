import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { MES_ORDER } from "@/lib/stats";

export const dynamic = "force-dynamic";

/** Camps de Cliente que es poden editar des del panell (la resta no es toquen des d'aquí). */
const CAMPOS_EDITABLES = ["poblacion", "urlProducto", "urlLooker", "contactoVentas", "info", "email", "codigo"] as const;
type CampoEditable = (typeof CAMPOS_EDITABLES)[number];

type EstadoMes = {
  clienteId: string;
  ano: number;
  mes: string;
  ventasEnviadas: boolean;
  facturaRecibida: boolean;
};

/**
 * El panell de gestió: la fulla HOME de l'Excel. Clients amb les seves dades de contacte i les
 * caselles de "ventas enviadas" / "facturas recibidas" de cada mes.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const ano = parseInt(String(new URL(req.url).searchParams.get("ano")), 10);
    if (isNaN(ano)) return NextResponse.json({ error: "Año no válido" }, { status: 400 });

    const { data: clientes, error } = await supabase
      .from("Cliente")
      .select("id, nombre, codigo, email, poblacion, urlProducto, urlLooker, contactoVentas, info")
      .eq("activo", true)
      .order("nombre");
    if (error) throw error;

    const { data: estados } = await supabase.from("EstadoMes").select("*").eq("ano", ano);

    const porCliente = new Map<string, Record<string, { ventasEnviadas: boolean; facturaRecibida: boolean }>>();
    for (const e of (estados || []) as EstadoMes[]) {
      if (!porCliente.has(e.clienteId)) porCliente.set(e.clienteId, {});
      porCliente.get(e.clienteId)![e.mes] = {
        ventasEnviadas: e.ventasEnviadas,
        facturaRecibida: e.facturaRecibida,
      };
    }

    // Sense això el navegador es guarda la resposta i, en crear un client, sembla que no s'hagi creat.
    return NextResponse.json(
      (clientes || []).map((c) => ({ ...c, estados: porCliente.get(c.id) ?? {} })),
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al cargar el panel" }, { status: 500 });
  }
}

/**
 * Desa un canvi del panell. Si el cos porta `mes`, és una casella (EstadoMes); si porta `campo`, és una
 * dada del client.
 */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const clienteId = String(body.clienteId ?? "");
    if (!clienteId) return NextResponse.json({ error: "Falta el cliente" }, { status: 400 });

    const { data: cliente } = await supabase.from("Cliente").select("id").eq("id", clienteId).maybeSingle();
    if (!cliente) return NextResponse.json({ error: "El cliente no existe" }, { status: 400 });

    // Una casella d'un mes. El client envia sempre les DUES caselles, no només la que ha tocat: si el
    // servidor llegís l'estat per completar-lo, marcar-ne dues de seguides perdria la primera (la segona
    // petició llegiria abans que la primera hagués escrit).
    if (body.mes != null) {
      const mes = String(body.mes);
      const ano = parseInt(String(body.ano), 10);
      if (!MES_ORDER.includes(mes) || isNaN(ano)) {
        return NextResponse.json({ error: "Mes o año no válidos" }, { status: 400 });
      }
      if (typeof body.ventasEnviadas !== "boolean" || typeof body.facturaRecibida !== "boolean") {
        return NextResponse.json({ error: "Faltan los valores de las casillas" }, { status: 400 });
      }

      const fila = {
        clienteId,
        ano,
        mes,
        ventasEnviadas: body.ventasEnviadas,
        facturaRecibida: body.facturaRecibida,
      };

      const { error } = await supabase.from("EstadoMes").upsert(fila, { onConflict: "clienteId,ano,mes" });
      if (error) throw error;
      return NextResponse.json(fila);
    }

    // Una dada del client
    const campo = String(body.campo ?? "") as CampoEditable;
    if (!CAMPOS_EDITABLES.includes(campo)) {
      return NextResponse.json({ error: `Campo no editable: ${campo}` }, { status: 400 });
    }
    const valor = body.valor === "" || body.valor == null ? null : String(body.valor).trim();

    const { error } = await supabase.from("Cliente").update({ [campo]: valor }).eq("id", clienteId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
