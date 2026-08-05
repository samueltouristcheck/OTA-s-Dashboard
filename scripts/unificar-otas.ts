/**
 * Unifica els noms d'OTA duplicats (mateixa OTA escrita de maneres diferents) en un sol nom canònic,
 * SUMANT les entrades quan dues variants cauen a la mateixa clau natural
 * (clienteId, ota, tipoEntrada, producto, mes, ano).
 *
 * No esborra vendes: només reanomena i, si cal, fusiona sumant.
 *
 *   npm run unificar:otas -- --prova   -> només informa, no toca res
 *   npm run unificar:otas              -> aplica els canvis
 */
import "dotenv/config";
import { supabase } from "../src/lib/supabase";

// variant -> nom canònic
const MAP: Record<string, string> = {
  "Atrapalo": "Atrápalo",
  "ATRÁPALO": "Atrápalo",
  "Átrapalo": "Atrápalo",
  "BCN enjoy": "BCN Enjoy",
  "Fent Pais": "Fent País",
  "Get your Guide": "Get Your Guide",
  "GYG": "Get Your Guide",
  "Go- city - BCN pass": "Go City - BCN Pass",
  "Hellotcikets": "Hellotickets",
  "Smartbox": "SmartBox",
  "Tiqets - Booking Engine": "Tiqets - Booking engine",
  "Booking Engine - Tiqets": "Tiqets - Booking engine",
  "TIxalia": "Tixalia",
  "Musement/ Booking": "Musement",
};

type Fila = {
  id: string;
  clienteId: string;
  ota: string;
  tipoEntrada: string;
  producto: string;
  mes: string;
  ano: number;
  numeroEntradas: number;
};

const PAGE = 1000;

async function fetchRowsPerOtes(otes: string[]): Promise<Fila[]> {
  const out: Fila[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("Venta")
      .select("id, clienteId, ota, tipoEntrada, producto, mes, ano, numeroEntradas")
      .in("ota", otes)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    out.push(...(data as Fila[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

function clau(f: { clienteId: string; ota: string; tipoEntrada: string; producto: string; mes: string; ano: number }) {
  return [f.clienteId, f.ota, f.tipoEntrada, f.producto, f.mes, f.ano].join("||");
}

async function main() {
  const prova = process.argv.includes("--prova");
  const variants = Object.keys(MAP);
  const canonics = [...new Set(Object.values(MAP))];

  // 1) Files de les variants (les que reanomenarem) i files canòniques ja existents.
  const filesVariants = await fetchRowsPerOtes(variants);
  const filesCanoniques = await fetchRowsPerOtes(canonics);

  // Valor canònic existent per clau natural (destí).
  const valorCanonicExistent = new Map<string, number>();
  for (const f of filesCanoniques) {
    valorCanonicExistent.set(clau(f), (valorCanonicExistent.get(clau(f)) || 0) + f.numeroEntradas);
  }

  // 2) Agrupem les variants per la clau natural DESTÍ (amb l'ota ja canònica).
  const grups = new Map<
    string,
    { desti: { clienteId: string; ota: string; tipoEntrada: string; producto: string; mes: string; ano: number }; sumaVariants: number; ids: string[] }
  >();
  for (const f of filesVariants) {
    const destiOta = MAP[f.ota];
    const desti = { clienteId: f.clienteId, ota: destiOta, tipoEntrada: f.tipoEntrada, producto: f.producto, mes: f.mes, ano: f.ano };
    const k = clau(desti);
    if (!grups.has(k)) grups.set(k, { desti, sumaVariants: 0, ids: [] });
    const g = grups.get(k)!;
    g.sumaVariants += f.numeroEntradas;
    g.ids.push(f.id);
  }

  // Resum per variant.
  const perVariant: Record<string, number> = {};
  for (const f of filesVariants) perVariant[f.ota] = (perVariant[f.ota] || 0) + f.numeroEntradas;

  console.log(`${prova ? "[PROVA] " : ""}Variants trobades: ${filesVariants.length} files\n`);
  for (const v of variants) {
    if (perVariant[v] != null) console.log(`  ${v.padEnd(26)} -> ${MAP[v].padEnd(26)}  (${perVariant[v]} entrades)`);
  }
  console.log(`\nClaus destí afectades: ${grups.size}`);
  const fusions = [...grups.values()].filter((g) => valorCanonicExistent.has(clau(g.desti)));
  console.log(`  de les quals fusionen amb una fila canònica existent (se sumen): ${fusions.length}`);

  const totalVariants = Object.values(perVariant).reduce((s, n) => s + n, 0);
  console.log(`\nEntrades a reassignar: ${totalVariants} (no es perd cap)`);

  if (prova) {
    console.log("\n[PROVA] No s'ha tocat res.");
    return;
  }

  // 3) Aplicar: upsert canònic amb el total (existent + variants) i esborrar les variants.
  let upserts = 0;
  let esborrades = 0;
  const grupsArr = [...grups.values()];
  for (const g of grupsArr) {
    const total = (valorCanonicExistent.get(clau(g.desti)) || 0) + g.sumaVariants;
    const { error: eUp } = await supabase
      .from("Venta")
      .upsert({ ...g.desti, numeroEntradas: total }, { onConflict: "clienteId,ota,tipoEntrada,producto,mes,ano" });
    if (eUp) throw eUp;
    upserts++;

    // Esborrar les files variants d'aquest grup (en lots).
    for (let i = 0; i < g.ids.length; i += 200) {
      const lot = g.ids.slice(i, i + 200);
      const { error: eDel } = await supabase.from("Venta").delete().in("id", lot);
      if (eDel) throw eDel;
      esborrades += lot.length;
    }
  }

  console.log(`\nFet. Files canòniques escrites/actualitzades: ${upserts}. Files variants esborrades: ${esborrades}.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
