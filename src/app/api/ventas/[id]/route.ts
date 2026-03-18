import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const { clienteId, ota, tipoEntrada, mes, ano, numeroEntradas, producto } = body;
    const updates: Record<string, unknown> = {};
    if (clienteId != null) updates.clienteId = clienteId;
    if (ota != null) updates.ota = String(ota).trim();
    if (tipoEntrada != null) updates.tipoEntrada = String(tipoEntrada).trim();
    if (mes != null) updates.mes = String(mes).trim();
    if (ano != null) updates.ano = parseInt(String(ano), 10);
    if (numeroEntradas != null) {
      const n = parseInt(String(numeroEntradas), 10);
      if (isNaN(n) || n < 0) {
        return NextResponse.json({ error: "Número de entradas inválido" }, { status: 400 });
      }
      updates.numeroEntradas = n;
    }
    if (producto != null) updates.producto = String(producto).trim();
    const { data, error } = await supabase
      .from("Venta")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ...data, anio: data.ano });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { id } = await params;
    const { error } = await supabase.from("Venta").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
