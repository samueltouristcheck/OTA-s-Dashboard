/**
 * Importa l'històric dels clients nous des de les seves pestanyes individuals dels Excels anuals
 * (format mesos-en-columnes: OTA | PRODUCTO | TIPO ENTRADA | ENE..DIC).
 *
 * La correspondència local → pestanya surt dels enllaços del HOME (autoritativa, no endevinada).
 *   npm run importar:nous            -- escriu
 *   npm run importar:nous -- --prova -- només informa
 */
import "dotenv/config";
import { fetchRawRows } from "../src/lib/google-sheets";
import { MES_ORDER } from "../src/lib/stats";
import { supabase } from "../src/lib/supabase";

const SHEETS: Record<number, string> = {
  2024: "19SBzHUXV1n4dU_IHHXQJ5Eikns1mgbcrJJn-roWMeAI",
  2025: "1_bPkjeg8bAZcJZhL2aJeAoxnFpSDTx_72XpzqvXcRtg",
  2026: "1k2yJEJZ6tn1ajO3WFzbUanFUuc0SJUlNT_x9Bu3R0fY",
};

// Client (tal com el vaig crear a la BD) → pestanya de l'Excel (segons els enllaços del HOME).
const MAPA: Record<string, string> = {
  "Banyoles": "BY",
  "Illa Fantasia": "IF",
  "Recinte Modernista de Sant Pau": "SP",
  "Aquàrium Barcelona": "AQ",
  "Locker Barcelona": "LK",
  "Casino Barcelona": "CB",
  "Barcelona NightCard": "NC",
  "Gaudí Experiència": "GEX",
  "Sinagoga Mayor de Barcelona": "SMB",
  "Tour Santa María del Mar": "SMM",
  "Parc de la Sèquia": "PS",
  "Museo del Agua y el Textil (MAT)": "MAT",
  "Cal Gerrer - Museu Marilyn": "MMST",
  "Monestir de Sant Cugat": "MSC",
  "Museu del Còmic": "MCSC",
  "Museu del Cinema": "MCG",
  "Museu de les Anxoves - Solès": "MA",
  "Espai Cràter": "EC",
  "Reserva de Wild Forest": "WFO",
  "Nautipic": "NAU",
};

type Fila = { clienteId: string; ota: string; tipoEntrada: string; mes: string; ano: number; numeroEntradas: number; producto: string };

async function llegirTab(sheetId: string, tab: string, año: number, clienteId: string): Promise<Fila[]> {
  let rows: string[][];
  try {
    rows = await fetchRawRows(sheetId, tab);
  } catch {
    return []; // la pestanya no existeix en aquell any
  }
  if (rows.length < 2) return [];
  // Columnes: 0=OTA, 1=PRODUCTO, 2=TIPO, 3..14 = ENE..DIC
  const out: Fila[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const ota = String(r[0] ?? "").trim();
    if (!ota) continue;
    const producto = String(r[1] ?? "").trim() || "General";
    const tipo = String(r[2] ?? "").trim() || "General";
    for (let m = 0; m < 12; m++) {
      const n = parseInt(String(r[3 + m] ?? "").replace(/\s/g, ""), 10);
      if (!isNaN(n) && n > 0) {
        out.push({ clienteId, ota, tipoEntrada: tipo, mes: MES_ORDER[m], ano: año, numeroEntradas: n, producto });
      }
    }
  }
  return out;
}

async function main() {
  const prova = process.argv.includes("--prova");
  const { data: clientes } = await supabase.from("Cliente").select("id, nombre");
  const idPerNom = new Map((clientes || []).map((c) => [c.nombre, c.id]));

  let totalGeneral = 0;
  const perClient: { nom: string; perAny: Record<number, number>; files: number }[] = [];

  for (const [nom, tab] of Object.entries(MAPA)) {
    const clienteId = idPerNom.get(nom);
    if (!clienteId) { console.log(`  (!) No trobo el client "${nom}" a la BD, el salto`); continue; }

    const totes: Fila[] = [];
    const perAny: Record<number, number> = {};
    for (const [anyStr, sheetId] of Object.entries(SHEETS)) {
      const any = Number(anyStr);
      const files = await llegirTab(sheetId, tab, any, clienteId);
      totes.push(...files);
      perAny[any] = files.reduce((s, f) => s + f.numeroEntradas, 0);
    }
    const tot = totes.reduce((s, f) => s + f.numeroEntradas, 0);
    totalGeneral += tot;
    perClient.push({ nom, perAny, files: totes.length });

    if (!prova && totes.length) {
      const LOT = 500;
      for (let i = 0; i < totes.length; i += LOT) {
        const { error } = await supabase
          .from("Venta")
          .upsert(totes.slice(i, i + LOT), { onConflict: "clienteId,ota,tipoEntrada,producto,mes,ano" });
        if (error) throw error;
      }
    }
  }

  console.log(`\n${prova ? "[PROVA] " : ""}Import per client (entrades):\n`);
  console.log("CLIENT".padEnd(34), "2024".padStart(7), "2025".padStart(7), "2026".padStart(7), "FILES".padStart(7));
  for (const c of perClient.sort((a, b) => a.nom.localeCompare(b.nom))) {
    console.log(c.nom.padEnd(34), String(c.perAny[2024] || "·").padStart(7), String(c.perAny[2025] || "·").padStart(7), String(c.perAny[2026] || "·").padStart(7), String(c.files).padStart(7));
  }
  console.log(`\nTotal d'entrades ${prova ? "que s'importarien" : "importades"}: ${totalGeneral}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
