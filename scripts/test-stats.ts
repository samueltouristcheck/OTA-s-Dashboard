import { computeStats, computeComparativa, parseStatsFilters, type StatsRow } from "../src/lib/stats";
import { esIdSinteticDeSheets } from "../src/lib/clientes-sheet";
import { preveuMes, mesSeguent, capsDeSetmana, indexMes, type VentaMensual } from "../src/lib/prevision";

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

// === Previsió ===

const NOMS_MES = [
  "01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio",
  "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre",
];

// Museu estable: 500 cada mes, 3 anys complets (2023-2025). Preveure el mes següent (gener 2026,
// horitzó 1) ha de donar ~500 amb fiabilitat alta.
const estable: VentaMensual[] = [];
for (const año of [2023, 2024, 2025]) {
  for (let m = 0; m < 12; m++) estable.push({ mes: NOMS_MES[m], año, numeroEntradas: 500 });
}
const pEstable = preveuMes(estable, { año: 2026, mesIndex: 0 });
check("previsió estable ~500", pEstable.central >= 480 && pEstable.central <= 520, true);
check("previsió estable té dades", pEstable.hayDatos, true);
check("fiabilitat alta amb dades estables", pEstable.fiabilidad.porcentaje >= 70, true);
check("rang estret quan és fiable", pEstable.max - pEstable.min < pEstable.central, true);

// Tendència creixent: 100 → 200 → 300 al gener; el 2026 ha de preveure per sobre de 300.
const creixent: VentaMensual[] = [
  { mes: "01. Enero", año: 2023, numeroEntradas: 100 },
  { mes: "01. Enero", año: 2024, numeroEntradas: 200 },
  { mes: "01. Enero", año: 2025, numeroEntradas: 300 },
];
check("la tendència creixent puja la previsió", preveuMes(creixent, { año: 2026, mesIndex: 0 }).central > 300, true);

// Un mes sense històric NO ha d'inventar cap número.
const senseMes: VentaMensual[] = [{ mes: "01. Enero", año: 2025, numeroEntradas: 300 }];
const pSense = preveuMes(senseMes, { año: 2026, mesIndex: 6 }); // juliol, que no té dades
check("sense històric: no hi ha dades", pSense.hayDatos, false);
check("sense històric: central 0", pSense.central, 0);
check("sense històric: fiabilitat 0", pSense.fiabilidad.porcentaje, 0);

// Menys anys → menys fiabilitat. Un sol gener contra els tres del museu estable.
const unAny: VentaMensual[] = [{ mes: "01. Enero", año: 2025, numeroEntradas: 500 }];
check(
  "un any dona menys fiabilitat que tres",
  preveuMes(unAny, { año: 2026, mesIndex: 0 }).fiabilidad.porcentaje < pEstable.fiabilidad.porcentaje,
  true
);

// mesSeguent: després del desembre 2025 ve el gener 2026; enmig de l'any, el mes següent.
check("mes següent salta d'any", mesSeguent(estable), { año: 2026, mesIndex: 0 });
check(
  "mes següent dins de l'any",
  mesSeguent([{ mes: "07. Julio", año: 2025, numeroEntradas: 10 }]),
  { año: 2025, mesIndex: 7 }
);

// Any incomplet: es descarta del càlcul (no arrossega la previsió avall) i es marca com a avís intern.
const ambIncomplet: VentaMensual[] = [];
for (const año of [2023, 2024]) for (let m = 0; m < 12; m++) ambIncomplet.push({ mes: NOMS_MES[m], año, numeroEntradas: 1000 });
// 2025 amb només un 20% de les vendes (dades a mitges).
for (let m = 0; m < 12; m++) ambIncomplet.push({ mes: NOMS_MES[m], año: 2025, numeroEntradas: 200 });
const pInc = preveuMes(ambIncomplet, { año: 2026, mesIndex: 0 });
check("previsió ignora l'any incomplet (~1000, no ~200)", pInc.central >= 850 && pInc.central <= 1150, true);
check("l'any incomplet genera avís intern", !!pInc.avisoDatos, true);

// Helpers de calendari.
check("caps de setmana de juliol 2026", capsDeSetmana(2026, 6), 8); // 4 dissabtes + 4 diumenges
check("indexMes amb prefix", indexMes("07. Julio"), 6);
check("indexMes sense prefix", indexMes("Julio"), 6);

console.log(fails === 0 ? "\nTOT OK" : `\n${fails} FALLADES`);
process.exit(fails === 0 ? 0 : 1);
