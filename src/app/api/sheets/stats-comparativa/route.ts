import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { fetchSheetData } from "@/lib/google-sheets";

const MES_ORDER = ["01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio", "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre"];

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sheetId = process.env.GOOGLE_SHEETS_ID;
    if (!sheetId) {
      return NextResponse.json({ error: "GOOGLE_SHEETS_ID no configurado" }, { status: 400 });
    }

    const tabName = process.env.GOOGLE_SHEETS_TAB || undefined;
    const rows = await fetchSheetData(sheetId, tabName);

    const { searchParams } = new URL(req.url);
    const clienteNombre = searchParams.get("clienteId") || searchParams.get("cliente");
    const comparativa = searchParams.get("comparativa") || "";
    const añoParam = searchParams.get("año");
    const mesParam = searchParams.get("mes");
    const otaParam = searchParams.get("ota");
    const tipoParam = searchParams.get("tipoEntrada");
    const añoList = añoParam ? añoParam.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)) : [];
    const mesList = mesParam ? mesParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const otaList = otaParam ? otaParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const tipoList = tipoParam ? tipoParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

    const mesMatches = (rowMes: string, filterMes: string) => {
      if (!filterMes) return true;
      const rowNorm = String(rowMes || "").trim();
      const filterNorm = String(filterMes || "").trim();
      if (rowNorm === filterNorm) return true;
      const filterName = filterNorm.replace(/^\d+\.\s*/, "").trim();
      return rowNorm === filterName || rowNorm.endsWith(filterName);
    };

    let filtered = rows;
    const clienteMatch = (rowCliente: string, filterCliente: string) =>
      String(rowCliente || "").trim().toLowerCase() === String(filterCliente || "").trim().toLowerCase();

    if (payload.role === "client") {
      if (payload.clienteNombre) {
        filtered = filtered.filter((r) => clienteMatch(r.cliente, payload.clienteNombre!));
      } else {
        filtered = [];
      }
    } else if (clienteNombre) {
      filtered = filtered.filter((r) => clienteMatch(r.cliente, clienteNombre));
    }
    if (mesList.length) filtered = filtered.filter((r) => mesList.some((m) => mesMatches(r.mes, m)));
    if (otaList.length) filtered = filtered.filter((r) => otaList.includes(String(r.ota || "").trim()));
    if (tipoList.length) filtered = filtered.filter((r) => tipoList.includes(String(r.tipoEntrada || "").trim()));

    if (comparativa === "interanual") {
      let años = [...new Set(filtered.map((r) => r.año))].sort((a, b) => b - a);
      if (añoList.length) años = años.filter((a) => añoList.includes(a));
      const porAño: Record<number, { porMes: Record<string, number>; total: number; porOta: Record<string, number> }> = {};
      for (const a of años) {
        const byYear = filtered.filter((r) => r.año === a);
        const porMes: Record<string, number> = {};
        const porOta: Record<string, number> = {};
        let total = 0;
        for (const r of byYear) {
          porMes[r.mes] = (porMes[r.mes] || 0) + r.numeroEntradas;
          porOta[r.ota] = (porOta[r.ota] || 0) + r.numeroEntradas;
          total += r.numeroEntradas;
        }
        porAño[a] = { porMes, total, porOta };
      }
      return NextResponse.json({ tipo: "interanual", porAño, años });
    }

    if (comparativa === "intermensual") {
      let intermensualData = filtered;
      if (añoList.length) intermensualData = intermensualData.filter((r) => añoList.includes(r.año));
      const meses = [...new Set(intermensualData.map((r) => r.mes))].sort((a, b) => MES_ORDER.indexOf(a) - MES_ORDER.indexOf(b));
      const porMes: Record<string, { porAño: Record<number, number>; total: number }> = {};
      for (const m of meses) {
        const byMes = intermensualData.filter((r) => mesMatches(r.mes, m));
        const porAño: Record<number, number> = {};
        let total = 0;
        for (const r of byMes) {
          porAño[r.año] = (porAño[r.año] || 0) + r.numeroEntradas;
          total += r.numeroEntradas;
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
