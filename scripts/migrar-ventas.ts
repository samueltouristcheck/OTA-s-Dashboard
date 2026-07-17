/**
 * Migra l'històric de vendes dels Excels anuals cap a la base de dades.
 *
 * Llegeix la pestanya "Auto" de cada Excel, que ja té la forma que volem (una fila per
 * client/OTA/tipus/mes/producte). Es pot executar tantes vegades com calgui: escriu amb upsert
 * sobre la clau natural de Venta, o sigui que no duplica res.
 *
 *   npm run migrar:ventas             -- tots els anys
 *   npm run migrar:ventas -- --any=2026
 *   npm run migrar:ventas -- --prova  -- no escriu res, només informa
 */
import "dotenv/config";
import { fetchRawRows } from "../src/lib/google-sheets";
import { canonicalitzaNomClient, clientSensePerfil, normKey } from "../src/lib/clientes-sheet";
import { MES_ORDER } from "../src/lib/stats";
import { supabase } from "../src/lib/supabase";

const FULLS = [
  { any: 2024, id: "19SBzHUXV1n4dU_IHHXQJ5Eikns1mgbcrJJn-roWMeAI" },
  { any: 2025, id: "1_bPkjeg8bAZcJZhL2aJeAoxnFpSDTx_72XpzqvXcRtg" },
  { any: 2026, id: "1k2yJEJZ6tn1ajO3WFzbUanFUuc0SJUlNT_x9Bu3R0fY" },
];

const PESTANYA = "Auto";

type FilaVenda = {
  clienteId: string;
  ota: string;
  tipoEntrada: string;
  mes: string;
  ano: number;
  numeroEntradas: number;
  producto: string;
};

/** Índex de cada columna de la pestanya Auto, buscada pel títol i no per posició. */
function indexaColumnes(headers: string[]) {
  const troba = (...noms: string[]) => {
    const i = headers.findIndex((h) => noms.some((n) => normKey(h ?? "") === normKey(n)));
    if (i < 0) throw new Error(`No trobo la columna "${noms[0]}". Capçaleres: ${headers.join(" | ")}`);
    return i;
  };
  return {
    id: troba("ID"),
    cliente: troba("Cliente"),
    ota: troba("OTA"),
    tipo: troba("Tipo de Entrada"),
    mes: troba("Mes respuesta", "Mes"),
    entradas: troba("Número de entradas", "Numero de entradas"),
    producto: troba("Producto"),
  };
}

/** "01. Enero" tal com l'espera la resta de l'app; accepta també "Enero". */
function normalitzaMes(raw: string): string | null {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  const exacte = MES_ORDER.find((m) => m === v);
  if (exacte) return exacte;
  const senseprefix = normKey(v.replace(/^\d+\.\s*/, ""));
  return MES_ORDER.find((m) => normKey(m.replace(/^\d+\.\s*/, "")) === senseprefix) ?? null;
}

async function upsertClient(nombre: string, codigo: string | null): Promise<string> {
  const { data: existent } = await supabase
    .from("Cliente")
    .select("id, codigo")
    .ilike("nombre", nombre)
    .maybeSingle();

  const activo = !clientSensePerfil(nombre);

  if (existent) {
    await supabase
      .from("Cliente")
      .update({ activo, ...(codigo && !existent.codigo ? { codigo } : {}) })
      .eq("id", existent.id);
    return existent.id;
  }

  const { data: creat, error } = await supabase
    .from("Cliente")
    .insert({ nombre, activo, codigo })
    .select("id")
    .single();
  if (error) throw error;
  return creat.id;
}

async function migraAny(full: (typeof FULLS)[0], prova: boolean) {
  console.log(`\n=== ${full.any} ===`);
  const rows = await fetchRawRows(full.id, PESTANYA);
  if (!rows.length) {
    console.log("  La pestanya Auto és buida.");
    return;
  }

  const col = indexaColumnes(rows[0]);

  // Sigles per client (LG-1 -> LG). Només les guardem si el client en té una de sola:
  // MAPFRE en té dues (KBR i SL), una per producte.
  const siglesPerClient = new Map<string, Set<string>>();
  const agrupat = new Map<string, { nom: string; fila: Omit<FilaVenda, "clienteId">; }>();

  let llegides = 0;
  let zeros = 0;
  let descartades = 0;
  let sumades = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const nom = canonicalitzaNomClient(String(r[col.cliente] ?? ""));
    if (!nom) continue;
    llegides++;

    const mes = normalitzaMes(String(r[col.mes] ?? ""));
    const n = parseInt(String(r[col.entradas] ?? "").replace(/\s/g, ""), 10);
    const ota = String(r[col.ota] ?? "").trim();

    if (!mes || !ota || isNaN(n)) {
      descartades++;
      continue;
    }
    // Una fila a 0 és el mateix que no tenir-la: no omplim la taula de zeros.
    if (n <= 0) {
      zeros++;
      continue;
    }

    const sigla = String(r[col.id] ?? "").split("-")[0]?.trim();
    if (sigla) {
      if (!siglesPerClient.has(nom)) siglesPerClient.set(nom, new Set());
      siglesPerClient.get(nom)!.add(sigla);
    }

    const fila = {
      ota,
      tipoEntrada: String(r[col.tipo] ?? "").trim() || "General",
      mes,
      ano: full.any,
      numeroEntradas: n,
      producto: String(r[col.producto] ?? "").trim() || "General",
    };
    const clau = [nom, fila.ota, fila.tipoEntrada, fila.producto, fila.mes].join(" | ");

    const ja = agrupat.get(clau);
    if (ja) {
      // Dues files de l'Excel per a la mateixa combinació: se sumen (la clau natural només en permet una).
      ja.fila.numeroEntradas += n;
      sumades++;
    } else {
      agrupat.set(clau, { nom, fila });
    }
  }

  const noms = [...new Set([...agrupat.values()].map((v) => v.nom))].sort();
  console.log(`  Files llegides: ${llegides}   a zero: ${zeros}   descartades: ${descartades}   sumades: ${sumades}`);
  console.log(`  Combinacions a escriure: ${agrupat.size}   Clients: ${noms.length}`);

  const totalEntrades = [...agrupat.values()].reduce((s, v) => s + v.fila.numeroEntradas, 0);
  console.log(`  Total d'entrades: ${totalEntrades}`);

  const senseperfil = noms.filter((n) => clientSensePerfil(n));
  if (senseperfil.length) console.log(`  Sense perfil (es guarden igual): ${senseperfil.join(", ")}`);

  if (prova) {
    console.log("  [prova] no s'escriu res.");
    return;
  }

  const idPerNom = new Map<string, string>();
  for (const nom of noms) {
    const sigles = siglesPerClient.get(nom);
    const codigo = sigles && sigles.size === 1 ? [...sigles][0] : null;
    idPerNom.set(nom, await upsertClient(nom, codigo));
  }

  const files: FilaVenda[] = [...agrupat.values()].map((v) => ({
    clienteId: idPerNom.get(v.nom)!,
    ...v.fila,
  }));

  const LOT = 500;
  let escrites = 0;
  for (let i = 0; i < files.length; i += LOT) {
    const lot = files.slice(i, i + LOT);
    const { error } = await supabase
      .from("Venta")
      .upsert(lot, { onConflict: "clienteId,ota,tipoEntrada,producto,mes,ano" });
    if (error) throw error;
    escrites += lot.length;
    process.stdout.write(`\r  Escrites: ${escrites}/${files.length}`);
  }
  console.log("");
}

async function main() {
  const args = process.argv.slice(2);
  const prova = args.includes("--prova");
  const anyArg = args.find((a) => a.startsWith("--any="))?.split("=")[1];

  const fulls = anyArg ? FULLS.filter((f) => String(f.any) === anyArg) : FULLS;
  if (!fulls.length) {
    console.error(`Any no reconegut. Disponibles: ${FULLS.map((f) => f.any).join(", ")}`);
    process.exit(1);
  }

  for (const full of fulls) await migraAny(full, prova);

  if (!prova) {
    const { count } = await supabase.from("Venta").select("*", { count: "exact", head: true });
    console.log(`\nTotal de files a Venta: ${count}`);
  }
}

main().catch((e) => {
  console.error("\n" + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
});
