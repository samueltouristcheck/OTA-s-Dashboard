/**
 * Lista todos los clientes únicos de la columna Cliente en Google Sheets
 * Ejecutar: npm run clientes:list
 */
import "dotenv/config";
import { fetchSheetData } from "../src/lib/google-sheets";

async function main() {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const tabName = process.env.GOOGLE_SHEETS_TAB || undefined;

  if (!sheetId) {
    console.error("GOOGLE_SHEETS_ID no configurado en .env");
    process.exit(1);
  }

  console.log("Leyendo de Google Sheets...\n");

  const rows = await fetchSheetData(sheetId, tabName);
  const clientes = Array.from(new Set(rows.map((r) => r.cliente).filter(Boolean))).sort();

  console.log("=== CLIENTES EN LA COLUMNA CLIENTE ===\n");
  if (clientes.length === 0) {
    console.log("No se encontraron clientes. Verifica que la hoja tenga la columna 'Cliente'.");
  } else {
    clientes.forEach((c, i) => console.log(`${i + 1}. ${c}`));
    console.log(`\nTotal: ${clientes.length} clientes`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
