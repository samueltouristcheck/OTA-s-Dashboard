/**
 * Còpia de seguretat de les taules Venta i Cliente a un fitxer JSON.
 * Executar: npm run backup:ventas
 */
import "dotenv/config";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { fetchVentasRows } from "../src/lib/ventas-db";
import { supabase } from "../src/lib/supabase";

async function main() {
  const ventas = await fetchVentasRows(null);
  const { data: clientes, error } = await supabase.from("Cliente").select("*");
  if (error) throw error;

  const dir = join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const file = join(dir, `venta-cliente-${stamp}.json`);

  writeFileSync(
    file,
    JSON.stringify({ fecha: new Date().toISOString(), ventas, clientes }, null, 2),
    "utf8"
  );

  console.log(`Ventas:   ${ventas.length}`);
  console.log(`Clientes: ${(clientes || []).length}`);
  console.log(`Total de entradas: ${ventas.reduce((s, v) => s + v.numeroEntradas, 0)}`);
  console.log(`\nGuardado en: ${file}`);
}

main();
