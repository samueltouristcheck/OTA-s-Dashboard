/**
 * Script para importar ventas desde CSV.
 * Formato esperado: ID,Marca temporal,Cliente,OTA,Tipo de Entrada,Mes respuesta,Número de entradas,Producto,Año
 * Ejecutar: npx tsx scripts/import-csv.ts datos.csv
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

const prisma = new PrismaClient();

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Uso: npx tsx scripts/import-csv.ts <archivo.csv>");
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.error("Archivo no encontrado:", fullPath);
    process.exit(1);
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const { data, errors } = Papa.parse(content, { header: true, skipEmptyLines: true });

  if (errors.length) {
    console.warn("Errores de parseo:", errors);
  }

  const clientesMap = new Map<string, string>();
  let imported = 0;

  for (const row of data as Record<string, string>[]) {
    const clienteNombre = (row["Cliente"] || row["cliente"] || "").trim();
    const ota = (row["OTA"] || row["ota"] || "").trim();
    const tipoEntrada = (row["Tipo de Entrada"] || row["tipoEntrada"] || "").trim();
    const mes = (row["Mes respuesta"] || row["mes"] || "").trim();
    const numeroEntradas = parseInt(row["Número de entradas"] || row["numeroEntradas"] || "0", 10);
    const producto = (row["Producto"] || row["producto"] || "").trim();
    const año = parseInt(row["Año"] || row["año"] || String(new Date().getFullYear()), 10);

    if (!clienteNombre || !ota || isNaN(numeroEntradas)) continue;

    let clienteId = clientesMap.get(clienteNombre);
    if (!clienteId) {
      let cliente = await prisma.cliente.findUnique({ where: { nombre: clienteNombre } });
      if (!cliente) {
        cliente = await prisma.cliente.create({ data: { nombre: clienteNombre } });
      }
      clienteId = cliente.id;
      clientesMap.set(clienteNombre, clienteId);
    }

    await prisma.venta.create({
      data: {
        clienteId,
        ota,
        tipoEntrada: tipoEntrada || "General",
        mes: mes || "01. Enero",
        anio: año,
        numeroEntradas,
        producto: producto || "General",
      },
    });
    imported++;
  }

  console.log(`Importadas ${imported} ventas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
