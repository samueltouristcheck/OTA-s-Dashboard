import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
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
    const producto = searchParams.get("producto");
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

    if (payload.role === "client" && payload.clienteNombre) {
      filtered = filtered.filter((r) => r.cliente === payload.clienteNombre);
    } else if (clienteNombre) {
      filtered = filtered.filter((r) => r.cliente === clienteNombre);
    }
    if (añoList.length) filtered = filtered.filter((r) => añoList.includes(r.año));
    if (mesList.length) filtered = filtered.filter((r) => mesList.some((m) => mesMatches(r.mes, m)));
    if (otaList.length) filtered = filtered.filter((r) => otaList.includes(String(r.ota || "").trim()));
    if (tipoList.length) filtered = filtered.filter((r) => tipoList.includes(String(r.tipoEntrada || "").trim()));
    if (producto) filtered = filtered.filter((r) => r.producto === producto);

    const ventas = filtered.map((r, i) => ({
      id: `sheet-${i}`,
      cliente: { nombre: r.cliente },
      ota: r.ota,
      tipoEntrada: r.tipoEntrada,
      mes: r.mes,
      anio: r.año,
      numeroEntradas: r.numeroEntradas,
      producto: r.producto,
    }));

    ventas.sort((a, b) => {
      if (a.anio !== b.anio) return b.anio - a.anio;
      const MES = ["01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio", "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre"];
      return MES.indexOf(a.mes) - MES.indexOf(b.mes);
    });

    return NextResponse.json(ventas);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener datos de Google Sheets" }, { status: 500 });
  }
}
