import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    const { searchParams } = new URL(req.url);
    const año = searchParams.get("año");
    const mes = searchParams.get("mes");
    const ota = searchParams.get("ota");
    const tipoEntrada = searchParams.get("tipoEntrada");
    const productoParam = searchParams.get("producto");
    const productoList = productoParam ? productoParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const clienteId = searchParams.get("clienteId");

    let filterClienteId = payload?.role === "client" ? payload.clienteId : clienteId;
    if (filterClienteId && !filterClienteId.startsWith("cliente-") && filterClienteId !== payload?.clienteId) {
      const { data: cl } = await supabase.from("Cliente").select("id").ilike("nombre", filterClienteId).limit(1).maybeSingle();
      if (cl) filterClienteId = cl.id;
    }

    let query = supabase.from("Venta").select("*").order("ano", { ascending: false }).order("mes", { ascending: true });

    if (filterClienteId) query = query.eq("clienteId", filterClienteId);
    if (año) query = query.eq("ano", parseInt(año));
    if (mes) query = query.eq("mes", mes);
    if (ota) query = query.eq("ota", ota);
    if (tipoEntrada) query = query.eq("tipoEntrada", tipoEntrada);
    if (productoList.length === 1) query = query.eq("producto", productoList[0]);
    if (productoList.length > 1) query = query.in("producto", productoList);

    const { data: ventas, error } = await query;
    if (error) throw error;

    const list = ventas || [];
    const clienteIds = [...new Set(list.map((v: { clienteId: string }) => v.clienteId))];
    const { data: clientes } = await supabase.from("Cliente").select("id,nombre").in("id", clienteIds);
    const clienteMap = new Map((clientes || []).map((c: { id: string; nombre: string }) => [c.id, c]));

    const formatted = list.map((v: { clienteId: string; ano: number }) => ({
      ...v,
      anio: v.ano,
      cliente: clienteMap.get(v.clienteId) || { nombre: "" },
    }));

    return NextResponse.json(formatted);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener ventas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const body = await req.json();
    const { clienteId, ota, tipoEntrada, mes, ano, numeroEntradas, producto } = body;
    if (!clienteId || !mes || numeroEntradas == null) {
      return NextResponse.json({ error: "Cliente, mes y número de entradas requeridos" }, { status: 400 });
    }
    const anoNum = parseInt(String(ano || new Date().getFullYear()), 10);
    const numEnt = parseInt(String(numeroEntradas), 10);
    if (isNaN(numEnt) || numEnt < 0) {
      return NextResponse.json({ error: "Número de entradas inválido" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("Venta")
      .insert({
        clienteId,
        ota: String(ota || "General").trim(),
        tipoEntrada: String(tipoEntrada || "General").trim(),
        mes: String(mes || "01. Enero").trim(),
        ano: anoNum,
        numeroEntradas: numEnt,
        producto: String(producto || "General").trim(),
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ...data, anio: data.ano, cliente: { nombre: "" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener ventas" }, { status: 500 });
  }
}
