import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MES_ORDER = ["01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio", "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre"];

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("clienteId");
    const comparativa = searchParams.get("comparativa") || "";
    const añoParam = searchParams.get("año");
    const mesParam = searchParams.get("mes");
    const otaParam = searchParams.get("ota");
    const tipoParam = searchParams.get("tipoEntrada");
    let filterClienteId = payload.role === "client" ? payload.clienteId : clienteId;
    if (filterClienteId && !filterClienteId.startsWith("cliente-")) {
      const { data: cl } = await supabase.from("Cliente").select("id").ilike("nombre", filterClienteId).limit(1).maybeSingle();
      if (cl) filterClienteId = cl.id;
    }

    let query = supabase.from("Venta").select("*");
    if (filterClienteId) query = query.eq("clienteId", filterClienteId);
    const { data: list, error } = await query;
    if (error) throw error;
    let ventas = list || [];

    const añoList = añoParam ? añoParam.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)) : [];
    const mesList = mesParam ? mesParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const otaList = otaParam ? otaParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const tipoList = tipoParam ? tipoParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

    if (añoList.length) ventas = ventas.filter((v) => añoList.includes(v.ano));
    if (mesList.length) ventas = ventas.filter((v) => mesList.some((m) => v.mes === m || v.mes?.includes(m.replace(/^\d+\.\s*/, ""))));
    if (otaList.length) ventas = ventas.filter((v) => otaList.includes(v.ota || ""));
    if (tipoList.length) ventas = ventas.filter((v) => tipoList.includes(v.tipoEntrada || ""));

    const filtered = ventas;

    if (comparativa === "interanual") {
      const años = [...new Set(filtered.map((v) => v.ano))].sort((a, b) => b - a);
      const porAño: Record<number, { porMes: Record<string, number>; total: number; porOta: Record<string, number> }> = {};
      for (const a of años) {
        const byYear = filtered.filter((v) => v.ano === a);
        const porMes: Record<string, number> = {};
        const porOta: Record<string, number> = {};
        let total = 0;
        for (const v of byYear) {
          porMes[v.mes] = (porMes[v.mes] || 0) + v.numeroEntradas;
          porOta[v.ota] = (porOta[v.ota] || 0) + v.numeroEntradas;
          total += v.numeroEntradas;
        }
        porAño[a] = { porMes, total, porOta };
      }
      return NextResponse.json({ tipo: "interanual", porAño, años });
    }

    if (comparativa === "intermensual") {
      const meses = [...new Set(filtered.map((v) => v.mes))].sort((a, b) => MES_ORDER.indexOf(a) - MES_ORDER.indexOf(b));
      const porMes: Record<string, { porAño: Record<number, number>; total: number }> = {};
      for (const m of meses) {
        const byMes = filtered.filter((v) => v.mes === m);
        const porAño: Record<number, number> = {};
        let total = 0;
        for (const v of byMes) {
          porAño[v.ano] = (porAño[v.ano] || 0) + v.numeroEntradas;
          total += v.numeroEntradas;
        }
        porMes[m] = { porAño, total };
      }
      return NextResponse.json({ tipo: "intermensual", porMes, meses });
    }

    return NextResponse.json({ error: "comparativa debe ser interanual o intermensual" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener comparativa" }, { status: 500 });
  }
}
