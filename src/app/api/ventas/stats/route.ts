import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    const { searchParams } = new URL(req.url);
    const año = searchParams.get("año");
    const mes = searchParams.get("mes");
    const ota = searchParams.get("ota");
    const productoParam = searchParams.get("producto");
    const productoList = productoParam ? productoParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const clienteId = searchParams.get("clienteId");

    let filterClienteId = payload?.role === "client" ? payload.clienteId : clienteId;
    if (filterClienteId && !filterClienteId.startsWith("cliente-")) {
      const { data: cl } = await supabase.from("Cliente").select("id").ilike("nombre", filterClienteId).limit(1).maybeSingle();
      if (cl) filterClienteId = cl.id;
    }

    let queryOpts = supabase.from("Venta").select("*");
    if (filterClienteId) queryOpts = queryOpts.eq("clienteId", filterClienteId);
    const { data: ventasForOptions } = await queryOpts;
    const rowsOpts = ventasForOptions || [];

    let query = supabase.from("Venta").select("*");
    if (filterClienteId) query = query.eq("clienteId", filterClienteId);
    if (año) query = query.eq("ano", parseInt(año));
    if (mes) query = query.eq("mes", mes);
    if (ota) query = query.eq("ota", ota);
    if (productoList.length === 1) query = query.eq("producto", productoList[0]);
    if (productoList.length > 1) query = query.in("producto", productoList);

    const { data: ventas, error } = await query;
    if (error) throw error;

    const list = ventas || [];

    const total = list.reduce((s: number, v: { numeroEntradas: number }) => s + v.numeroEntradas, 0);
    const porMes = list.reduce((acc: Record<string, number>, v: { mes: string; numeroEntradas: number }) => {
      acc[v.mes] = (acc[v.mes] || 0) + v.numeroEntradas;
      return acc;
    }, {});
    const porOta = list.reduce((acc: Record<string, number>, v: { ota: string; numeroEntradas: number }) => {
      acc[v.ota] = (acc[v.ota] || 0) + v.numeroEntradas;
      return acc;
    }, {});
    const porTipo = list.reduce((acc: Record<string, number>, v: { tipoEntrada: string; numeroEntradas: number }) => {
      acc[v.tipoEntrada] = (acc[v.tipoEntrada] || 0) + v.numeroEntradas;
      return acc;
    }, {});
    const porProducto = list.reduce((acc: Record<string, number>, v: { producto: string; numeroEntradas: number }) => {
      acc[v.producto] = (acc[v.producto] || 0) + v.numeroEntradas;
      return acc;
    }, {});
    const porAño = list.reduce((acc: Record<number, number>, v: { ano: number; numeroEntradas: number }) => {
      acc[v.ano] = (acc[v.ano] || 0) + v.numeroEntradas;
      return acc;
    }, {});

    const MES_ORDER = ["01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio", "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre"];
    const tipos = [...new Set(rowsOpts.map((v: { tipoEntrada: string }) => String(v.tipoEntrada || "").trim()).filter(Boolean))].sort();
    const otas = [...new Set(rowsOpts.map((v: { ota: string }) => String(v.ota || "").trim()).filter(Boolean))].sort();
    const años = [...new Set(rowsOpts.map((v: { ano: number }) => v.ano).filter(Boolean))].sort((a, b) => b - a);
    const mesesEnList = new Set(rowsOpts.map((v: { mes: string }) => String(v.mes || "").trim()).filter(Boolean));
    const meses = MES_ORDER.filter((m) => mesesEnList.has(m) || [...mesesEnList].some((s) => s.includes(m.replace(/^\d+\.\s*/, ""))));
    const productos = [...new Set(rowsOpts.map((v: { producto: string }) => String(v.producto || "").trim()).filter(Boolean))].sort();

    return NextResponse.json({
      total,
      porMes,
      porOta,
      porTipo,
      porProducto,
      porAño,
      filterOptions: { tipos, otas, años, meses: meses.length ? meses : MES_ORDER, productos },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener stats" }, { status: 500 });
  }
}
