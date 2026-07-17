/**
 * Compara les dues fonts de vendes: el full de Google (el que llegeix el dashboard avui) i la base de
 * dades (el que llegirà). És el semàfor abans de girar la font.
 *
 *   npm run comparar
 *   npm run comparar -- --detall     mostra totes les diferències, no només el resum
 */
import "dotenv/config";
import { fetchSheetData } from "../src/lib/google-sheets";
import { fetchVentasRows } from "../src/lib/ventas-db";
import { normalitzaClientSheet } from "../src/lib/clientes-sheet";
import { MES_ORDER } from "../src/lib/stats";
import { supabase } from "../src/lib/supabase";

type Total = Map<string, number>;

const clau = (cliente: string, ano: number, mes: string) => `${cliente}|||${ano}|||${mes}`;

function suma(mapa: Total, k: string, n: number) {
  mapa.set(k, (mapa.get(k) || 0) + n);
}

async function main() {
  const detall = process.argv.includes("--detall");

  const sheetId = process.env.GOOGLE_SHEETS_ID;
  if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_ID al .env");

  console.log("Llegint el full de Google...");
  const filesFull = await fetchSheetData(sheetId, process.env.GOOGLE_SHEETS_TAB || undefined);

  console.log("Llegint la base de dades...");
  const filesBD = await fetchVentasRows(null);
  const { data: clientes } = await supabase.from("Cliente").select("id, nombre");
  const nomPerId = new Map((clientes || []).map((c) => [c.id, c.nombre]));

  const full: Total = new Map();
  for (const r of filesFull) suma(full, clau(r.cliente, r.año, r.mes), r.numeroEntradas);

  const bd: Total = new Map();
  for (const v of filesBD) {
    const nom = nomPerId.get(v.clienteId);
    if (!nom) continue;
    // La font de Sheets amaga els clients sense perfil, o sigui que per comparar els hem de treure.
    const visible = normalitzaClientSheet(nom);
    if (!visible) continue;
    suma(bd, clau(visible, v.ano, v.mes), v.numeroEntradas);
  }

  const totalFull = [...full.values()].reduce((s, n) => s + n, 0);
  const totalBD = [...bd.values()].reduce((s, n) => s + n, 0);

  console.log("\n=== TOTALS ===");
  console.log(`Full de Google:   ${totalFull.toLocaleString("es")} entrades (${filesFull.length} files)`);
  console.log(`Base de dades:    ${totalBD.toLocaleString("es")} entrades (${filesBD.length} files)`);

  // Per any
  const anysFull = new Map<number, number>();
  const anysBD = new Map<number, number>();
  for (const [k, n] of full) anysFull.set(Number(k.split("|||")[1]), (anysFull.get(Number(k.split("|||")[1])) || 0) + n);
  for (const [k, n] of bd) anysBD.set(Number(k.split("|||")[1]), (anysBD.get(Number(k.split("|||")[1])) || 0) + n);
  const anys = [...new Set([...anysFull.keys(), ...anysBD.keys()])].sort();

  console.log("\n=== PER ANY ===");
  console.log("ANY     FULL        BD          DIFERÈNCIA");
  for (const a of anys) {
    const f = anysFull.get(a) || 0;
    const b = anysBD.get(a) || 0;
    const d = b - f;
    console.log(
      `${a}    ${String(f).padStart(9)}   ${String(b).padStart(9)}   ${d === 0 ? "iguals" : (d > 0 ? "+" : "") + d}`
    );
  }

  // Clients
  const clientsFull = new Set([...full.keys()].map((k) => k.split("|||")[0]));
  const clientsBD = new Set([...bd.keys()].map((k) => k.split("|||")[0]));
  const nomesFull = [...clientsFull].filter((c) => !clientsBD.has(c)).sort();
  const nomesBD = [...clientsBD].filter((c) => !clientsFull.has(c)).sort();

  console.log("\n=== CLIENTS ===");
  console.log(`Al full: ${clientsFull.size}   A la BD: ${clientsBD.size}`);
  if (nomesFull.length) console.log(`Només al full (es perdrien): ${nomesFull.join(", ")}`);
  if (nomesBD.length) console.log(`Només a la BD (apareixerien): ${nomesBD.join(", ")}`);
  if (!nomesFull.length && !nomesBD.length) console.log("Els mateixos clients a les dues fonts.");

  // Diferències per client/any/mes
  const totesLesClaus = new Set([...full.keys(), ...bd.keys()]);
  const difs: Array<{ cliente: string; ano: number; mes: string; full: number; bd: number }> = [];
  for (const k of totesLesClaus) {
    const f = full.get(k) || 0;
    const b = bd.get(k) || 0;
    if (f === b) continue;
    const [cliente, ano, mes] = k.split("|||");
    difs.push({ cliente, ano: Number(ano), mes, full: f, bd: b });
  }

  difs.sort(
    (x, y) =>
      Math.abs(y.bd - y.full) - Math.abs(x.bd - x.full) ||
      x.cliente.localeCompare(y.cliente) ||
      x.ano - y.ano ||
      MES_ORDER.indexOf(x.mes) - MES_ORDER.indexOf(y.mes)
  );

  console.log(`\n=== DIFERÈNCIES: ${difs.length} de ${totesLesClaus.size} combinacions client/any/mes ===`);
  if (!difs.length) {
    console.log("Cap. Les dues fonts diuen el mateix: es pot girar la font amb seguretat.");
    return;
  }

  const mostrar = detall ? difs : difs.slice(0, 25);
  console.log("CLIENT                        ANY   MES              FULL      BD    DIF");
  for (const d of mostrar) {
    console.log(
      `${d.cliente.padEnd(29)} ${d.ano}  ${d.mes.padEnd(15)} ${String(d.full).padStart(6)}  ${String(d.bd).padStart(6)}  ${
        d.bd - d.full > 0 ? "+" : ""
      }${d.bd - d.full}`
    );
  }
  if (!detall && difs.length > 25) console.log(`... i ${difs.length - 25} més. Fes servir --detall per veure-les totes.`);

  // Resum per client, que és el que diu on està el problema
  const perClient = new Map<string, { full: number; bd: number; difs: number }>();
  for (const d of difs) {
    if (!perClient.has(d.cliente)) perClient.set(d.cliente, { full: 0, bd: 0, difs: 0 });
    const p = perClient.get(d.cliente)!;
    p.full += d.full;
    p.bd += d.bd;
    p.difs++;
  }
  console.log("\n=== RESUM PER CLIENT (només els que no quadren) ===");
  console.log("CLIENT                        DIFS      FULL        BD    DIFERÈNCIA");
  for (const [c, p] of [...perClient.entries()].sort((a, b) => Math.abs(b[1].bd - b[1].full) - Math.abs(a[1].bd - a[1].full))) {
    console.log(
      `${c.padEnd(29)} ${String(p.difs).padStart(4)}  ${String(p.full).padStart(9)} ${String(p.bd).padStart(9)}   ${
        p.bd - p.full > 0 ? "+" : ""
      }${p.bd - p.full}`
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
