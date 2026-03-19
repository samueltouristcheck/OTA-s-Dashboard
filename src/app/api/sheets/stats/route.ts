import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
import { fetchSheetData } from "@/lib/google-sheets";

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

    const clienteMatch = (rowCliente: string, filterCliente: string) =>
      String(rowCliente || "").trim().toLowerCase() === String(filterCliente || "").trim().toLowerCase();

    const applyFilters = (data: typeof rows, exclude?: { mes?: boolean; ota?: boolean; tipo?: boolean }) => {
      let f = [...data];
      if (payload.role === "client") {
        if (payload.clienteNombre) {
          f = f.filter((r) => clienteMatch(r.cliente, payload.clienteNombre!));
        } else {
          f = []; // Cliente sin clienteNombre: no mostrar datos de otros
        }
      } else if (clienteNombre) {
        f = f.filter((r) => clienteMatch(r.cliente, clienteNombre));
      }
      if (añoList.length) f = f.filter((r) => añoList.includes(r.año));
      if (mesList.length && !exclude?.mes) f = f.filter((r) => mesList.some((m) => mesMatches(r.mes, m)));
      if (otaList.length && !exclude?.ota) f = f.filter((r) => otaList.includes(String(r.ota || "").trim()));
      if (tipoList.length && !exclude?.tipo) f = f.filter((r) => tipoList.includes(String(r.tipoEntrada || "").trim()));
      return f;
    };

    const filtered = applyFilters(rows);
    const filteredSinMes = applyFilters(rows, { mes: true });
    const filteredSinOta = applyFilters(rows, { ota: true });
    const filteredSinTipo = applyFilters(rows, { tipo: true });

    const total = filtered.reduce((s, v) => s + v.numeroEntradas, 0);
    const porMes = filteredSinMes.reduce((acc, v) => {
      acc[v.mes] = (acc[v.mes] || 0) + v.numeroEntradas;
      return acc;
    }, {} as Record<string, number>);
    const porOta = filteredSinOta.reduce((acc, v) => {
      acc[v.ota] = (acc[v.ota] || 0) + v.numeroEntradas;
      return acc;
    }, {} as Record<string, number>);
    const porTipo = filteredSinTipo.reduce((acc, v) => {
      acc[v.tipoEntrada] = (acc[v.tipoEntrada] || 0) + v.numeroEntradas;
      return acc;
    }, {} as Record<string, number>);
    const porProducto = filtered.reduce((acc, v) => {
      acc[v.producto] = (acc[v.producto] || 0) + v.numeroEntradas;
      return acc;
    }, {} as Record<string, number>);
    const porAño = filtered.reduce((acc, v) => {
      acc[v.año] = (acc[v.año] || 0) + v.numeroEntradas;
      return acc;
    }, {} as Record<number, number>);

    const tipos = [...new Set(rows.map((r) => String(r.tipoEntrada || "").trim()).filter(Boolean))].sort();
    const otas = [...new Set(rows.map((r) => String(r.ota || "").trim()).filter(Boolean))].sort();
    const años = [...new Set(rows.map((r) => r.año).filter(Boolean))].sort((a, b) => b - a);
    const MES_ORDER = ["01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio", "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre"];
    const mesesEnSheet = new Set(rows.map((r) => String(r.mes || "").trim()).filter(Boolean));
    const meses = MES_ORDER.filter((m) => mesesEnSheet.has(m) || [...mesesEnSheet].some((s) => s.includes(m.replace(/^\d+\.\s*/, ""))));

    return NextResponse.json({
      total,
      porMes,
      porOta,
      porTipo,
      porProducto,
      porAño,
      filterOptions: { tipos, otas, años, meses: meses.length ? meses : MES_ORDER },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener stats de Google Sheets" }, { status: 500 });
  }
}
