import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import Papa from "papaparse";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const content = await file.text();
    const { data, errors } = Papa.parse(content, { header: true, skipEmptyLines: true });

    if (errors.length) {
      return NextResponse.json({ error: "CSV inválido", details: errors }, { status: 400 });
    }

    const clientesMap = new Map<string, string>();
    let imported = 0;

    for (const row of data as Record<string, string>[]) {
      const clienteNombre = (row["Cliente"] || row["cliente"] || "").trim();
      const ota = (row["OTA"] || row["ota"] || "").trim();
      const tipoEntrada = (row["Tipo de Entrada"] || row["tipoEntrada"] || "General").trim();
      const mes = (row["Mes respuesta"] || row["mes"] || "01. Enero").trim();
      const numeroEntradas = parseInt(row["Número de entradas"] || row["numeroEntradas"] || "0", 10);
      const producto = (row["Producto"] || row["producto"] || "General").trim();
      const anio = parseInt(row["Año"] || row["año"] || String(new Date().getFullYear()), 10);

      if (!clienteNombre || !ota || isNaN(numeroEntradas)) continue;

      let clienteId = clientesMap.get(clienteNombre);
      if (!clienteId) {
        const { data: existing } = await supabase.from("Cliente").select("id").eq("nombre", clienteNombre).single();
        if (existing) {
          clienteId = existing.id;
        } else {
          const { data: created, error } = await supabase.from("Cliente").insert({ nombre: clienteNombre }).select("id").single();
          if (error) throw error;
          clienteId = created!.id;
        }
        clientesMap.set(clienteNombre, clienteId);
      }

      const { error } = await supabase.from("Venta").insert({
        clienteId,
        ota,
        tipoEntrada,
        mes,
        ano,
        numeroEntradas,
        producto,
      });
      if (error) throw error;
      imported++;
    }

    return NextResponse.json({ imported });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al importar" }, { status: 500 });
  }
}
