import { computeStats, computeComparativa, parseStatsFilters, type StatsRow } from "../src/lib/stats";
import { esIdSinteticDeSheets } from "../src/lib/clientes-sheet";

const rows: StatsRow[] = [
  { ota: "Fever", tipoEntrada: "General", mes: "06. Junio", año: 2026, numeroEntradas: 5, producto: "Vino catalán" },
  { ota: "Fever", tipoEntrada: "Niño", mes: "06. Junio", año: 2026, numeroEntradas: 2, producto: "3 vinos" },
  { ota: "Tiqets", tipoEntrada: "General", mes: "01. Enero", año: 2025, numeroEntradas: 10, producto: "Vino catalán" },
  { ota: "Tiqets", tipoEntrada: "General", mes: "01. Enero", año: 2024, numeroEntradas: 7, producto: "Vino catalán" },
];

const q = (s: string) => new URLSearchParams(s);
let fails = 0;
const check = (nom: string, real: unknown, esperat: unknown) => {
  const ok = JSON.stringify(real) === JSON.stringify(esperat);
  if (!ok) {
    fails++;
    console.log(`FALLA  ${nom}\n  esperat: ${JSON.stringify(esperat)}\n  real:    ${JSON.stringify(real)}`);
  } else console.log(`ok     ${nom}`);
};

// El bug principal de la BD: "2024,2025" es convertia en 2024 i perdia el 2025.
check("any multi-valor", computeStats(rows, parseStatsFilters(q("año=2024,2025"))).total, 17);
// tipoEntrada s'ignorava del tot a la BD.
check("filtre de tipus", computeStats(rows, parseStatsFilters(q("tipoEntrada=Niño"))).total, 2);
check("OTA multi-valor", computeStats(rows, parseStatsFilters(q("ota=Fever,Tiqets"))).total, 24);
check("producte", computeStats(rows, parseStatsFilters(q("producto=3 vinos"))).total, 2);
// Mes sense prefix numèric, com l'envia a vegades la UI.
check("mes sense prefix", computeStats(rows, parseStatsFilters(q("mes=Junio"))).total, 7);

// Lògica exclude: en filtrar per un mes, el selector de mesos ha de seguir mostrant els altres.
const s = computeStats(rows, parseStatsFilters(q("mes=06. Junio")));
check("porMes ignora el seu propi filtre", Object.keys(s.porMes).sort(), ["01. Enero", "06. Junio"]);
check("porOta respecta el filtre de mes", s.porOta, { Fever: 7 });
check("total respecta el filtre", s.total, 7);
check("opcions de filtre completes", s.filterOptions.años, [2026, 2025, 2024]);

// Comparativa: l'any tria què es compara, no retalla els totals.
const c = computeComparativa(rows, parseStatsFilters(q("año=2025")), "interanual");
check("interanual filtra els anys", c && c.tipo === "interanual" ? c.años : null, [2025]);
check("comparativa invàlida", computeComparativa(rows, parseStatsFilters(q("")), "cap"), null);

// Ids sintètics de Sheets contra ids reals: "cliente-golondrinas" i "cliente-mapfre" són clients de
// debò a la base de dades i no s'han de confondre amb els "cliente-0" que genera /api/sheets/clientes.
check("cliente-0 es sintetic", esIdSinteticDeSheets("cliente-0"), true);
check("cliente-12 es sintetic", esIdSinteticDeSheets("cliente-12"), true);
check("cliente-golondrinas es REAL", esIdSinteticDeSheets("cliente-golondrinas"), false);
check("cliente-mapfre es REAL", esIdSinteticDeSheets("cliente-mapfre"), false);
check("un uuid es real", esIdSinteticDeSheets("5b642469-79df-4b53-8e1e-238c3d039b72"), false);

console.log(fails === 0 ? "\nTOT OK" : `\n${fails} FALLADES`);
process.exit(fails === 0 ? 0 : 1);
