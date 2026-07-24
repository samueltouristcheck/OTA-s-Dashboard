/**
 * Previsió de vendes d'un museu, a partir del seu històric mensual.
 *
 * Tot el càlcul és aquí, pur i sense accés a dades ni a serveis externs, per poder-lo provar amb
 * `test:stats`. La capa meteo (curt termini, museus a l'aire lliure) s'aplica a fora, a l'API.
 *
 * Res d'"IA": és estacionalitat + tendència interanual + un ajust pel calendari. Explicable línia a
 * línia, que és el que permet ensenyar un % de fiabilitat honest en comptes d'un número màgic.
 */

import { MES_ORDER } from "./stats";

export type VentaMensual = { mes: string; año: number; numeroEntradas: number };

/** Índex 0-11 del mes ("06. Junio" o "Junio" → 5), o -1. */
export function indexMes(mes: string): number {
  const net = String(mes || "").trim();
  const i = MES_ORDER.indexOf(net);
  if (i >= 0) return i;
  const sensePrefix = net.replace(/^\d+\.\s*/, "").trim().toLowerCase();
  return MES_ORDER.findIndex((m) => m.replace(/^\d+\.\s*/, "").trim().toLowerCase() === sensePrefix);
}

/** Total d'entrades per (any, mes-index) a partir de les files, sumant OTA/producte/tipus. */
function totalsPerAnyMes(ventas: VentaMensual[]): Map<string, number> {
  const acc = new Map<string, number>();
  for (const v of ventas) {
    const im = indexMes(v.mes);
    if (im < 0) continue;
    const k = `${v.año}|${im}`;
    acc.set(k, (acc.get(k) || 0) + (Number(v.numeroEntradas) || 0));
  }
  return acc;
}

/** Total d'un any sencer. */
function totalAny(totals: Map<string, number>, any: number): number {
  let s = 0;
  for (let m = 0; m < 12; m++) s += totals.get(`${any}|${m}`) || 0;
  return s;
}

/**
 * Creixement interanual mitjà, comparant només anys consecutius amb dades a tots dos.
 * Retorna un factor (1.12 = +12%). Acotat a [0.5, 2] perquè un any atípic no dispari la previsió.
 */
function tendenciaInteranual(totals: Map<string, number>, anys: number[]): number {
  const ratios: number[] = [];
  for (let i = 1; i < anys.length; i++) {
    const previ = totalAny(totals, anys[i - 1]);
    const actual = totalAny(totals, anys[i]);
    if (previ > 0 && actual > 0) ratios.push(actual / previ);
  }
  if (!ratios.length) return 1;
  const mitjana = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return Math.min(2, Math.max(0.5, mitjana));
}

/** Dies de cap de setmana (dissabte/diumenge) d'un mes. `any` complet, `mes` 0-11. */
export function capsDeSetmana(any: number, mes: number): number {
  let n = 0;
  const dies = new Date(any, mes + 1, 0).getDate();
  for (let d = 1; d <= dies; d++) {
    const dow = new Date(any, mes, d).getDay();
    if (dow === 0 || dow === 6) n++;
  }
  return n;
}

/**
 * Festius laborables (que no cauen en cap de setmana) d'un mes, segons una taula per any.
 * Sumar-los als caps de setmana dona els "dies forts" del mes.
 */
export function festiusLaborables(any: number, mes: number, festius: string[]): number {
  let n = 0;
  for (const f of festius) {
    const [ay, am, ad] = f.split("-").map(Number);
    if (ay !== any || am - 1 !== mes) continue;
    const dow = new Date(ay, am - 1, ad).getDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
}

export type Fiabilitat = {
  porcentaje: number;
  motivos: string[];
};

/**
 * % de fiabilitat = observacions × estabilitat × horitzó, acotat a [30, 90] perquè no enganyi ni per
 * dalt ni per baix. Cada factor porta el seu motiu, perquè a la pantalla es vegi d'on surt.
 *
 * El primer factor són les vegades que hem vist AQUEST mes, no els anys totals de dades: una previsió
 * de juliol reposa en quants juliols coneixem. Dos que coincideixen és evidència feble, no un 90%.
 */
function calculaFiabilitat(valorsMateixMes: number[], mesesVista: number): Fiabilitat {
  const motivos: string[] = [];

  const ambDades = valorsMateixMes.filter((v) => v > 0);
  const n = ambDades.length;
  const factorObs = n >= 4 ? 1 : n === 3 ? 0.85 : n === 2 ? 0.7 : 0.5;
  motivos.push(n >= 3 ? `${n} años con este mes` : `solo ${n} año(s) con este mes`);

  // Estabilitat: coeficient de variació del mateix mes entre anys.
  let estabilitat = 0.7;
  if (ambDades.length >= 2) {
    const mitjana = ambDades.reduce((a, b) => a + b, 0) / ambDades.length;
    const variancia = ambDades.reduce((a, b) => a + (b - mitjana) ** 2, 0) / ambDades.length;
    const cv = mitjana > 0 ? Math.sqrt(variancia) / mitjana : 1;
    if (cv < 0.15) {
      estabilitat = 1;
      motivos.push("ventas muy estables");
    } else if (cv < 0.35) {
      estabilitat = 0.7;
      motivos.push("ventas moderadamente estables");
    } else {
      estabilitat = 0.4;
      motivos.push("ventas irregulares");
    }
  } else {
    estabilitat = 0.5;
    motivos.push("pocos datos de este mes");
  }

  const factorHoritzo = mesesVista <= 1 ? 1 : mesesVista <= 3 ? 0.8 : 0.6;
  if (mesesVista > 3) motivos.push("previsión a varios meses");

  const brut = 100 * factorObs * estabilitat * factorHoritzo;
  return { porcentaje: Math.round(Math.min(90, Math.max(30, brut))), motivos };
}

export type Prevision = {
  hayDatos: boolean;
  mensaje?: string;
  /** Avís quan les dades recents semblen incompletes: la previsió no és fiable fins que s'omplin. */
  avisoDatos?: string;
  año: number;
  mesIndex: number;
  mesNombre: string;
  central: number;
  min: number;
  max: number;
  fiabilidad: Fiabilitat;
  /** Punts de l'històric per pintar el gràfic: total per any del mateix mes. */
  historico: { año: number; entradas: number }[];
};

type SeleccioAnys = {
  /** Anys que es poden fer servir per calcular: ni en curs ni sospitosos d'incomplets. */
  usables: number[];
  /** Anys tancats que semblen incomplets (cauen molt respecte de l'anterior). Per al panell intern. */
  incomplets: number[];
  /** L'any en curs (l'últim amb dades no acabat), que no s'usa per a la tendència. */
  enCurs: number | null;
};

/**
 * Tria quins anys es fan servir per a la previsió.
 *
 * Es descarten dos tipus d'any que falsegen el càlcul cap avall:
 *  - **En curs**: l'últim any si el seu darrer mes no és desembre (encara no ha acabat).
 *  - **Incomplet**: un any tancat que cau més d'un 45% respecte de l'anterior. Sol ser que falten vendes
 *    per entrar; en tot cas convé revisar-ho. Es marca per al panell de superadmin, mai per al client.
 */
function seleccionaAnys(totals: Map<string, number>, anys: number[], ultimMesAbs: number): SeleccioAnys {
  const enCurs =
    ultimMesAbs >= 0 && ultimMesAbs % 12 < 11 ? Math.floor(ultimMesAbs / 12) : null;

  const tancats = anys.filter((a) => a !== enCurs);
  const incomplets: number[] = [];
  for (let i = 1; i < tancats.length; i++) {
    const prev = totalAny(totals, tancats[i - 1]);
    const cur = totalAny(totals, tancats[i]);
    if (prev > 0 && cur < prev * 0.55) incomplets.push(tancats[i]);
  }

  const usables = anys.filter((a) => a !== enCurs && !incomplets.includes(a));
  return { usables, incomplets, enCurs };
}

function avisIncompletes(incomplets: number[]): string | undefined {
  if (!incomplets.length) return undefined;
  const l = incomplets.join(", ");
  return `Los datos de ${l} parecen incompletos: la previsión se ha calculado sin ese año. Revisa que estén todas las ventas.`;
}

/**
 * Previsió d'un mes concret (o del següent al més recent amb dades).
 *
 * @param festius llista "YYYY-MM-DD" de festius per ajustar el calendari (buida = sense ajust).
 */
export function preveuMes(
  ventas: VentaMensual[],
  objetivo: { año: number; mesIndex: number },
  festius: string[] = []
): Prevision {
  const totals = totalsPerAnyMes(ventas);
  const anys = [...new Set(ventas.map((v) => v.año))].filter(Boolean).sort();
  const mesNombre = MES_ORDER[objetivo.mesIndex] ?? String(objetivo.mesIndex);

  // Últim mes amb dades reals (per a l'any en curs i per a l'horitzó).
  let ultimMes = -1;
  for (const k of totals.keys()) {
    const [a, m] = k.split("|").map(Number);
    ultimMes = Math.max(ultimMes, a * 12 + m);
  }

  // Descartar l'any en curs i els que semblen incomplets, que arrossegarien la previsió cap avall.
  const { usables, incomplets } = seleccionaAnys(totals, anys, ultimMes);
  const avisoDatos = avisIncompletes(incomplets);

  const base: Omit<Prevision, "central" | "min" | "max" | "fiabilidad"> & {
    central?: number;
  } = {
    hayDatos: false,
    avisoDatos,
    año: objetivo.año,
    mesIndex: objetivo.mesIndex,
    mesNombre,
    historico: [],
  };

  // Valors del mateix mes en anys usables anteriors a l'objectiu.
  const historicoMes = usables
    .filter((a) => a < objetivo.año)
    .map((a) => ({ año: a, entradas: totals.get(`${a}|${objetivo.mesIndex}`) || 0 }))
    .filter((p) => p.entradas > 0);

  if (historicoMes.length === 0) {
    return {
      ...base,
      central: 0,
      min: 0,
      max: 0,
      fiabilidad: { porcentaje: 0, motivos: ["sin histórico de este mes"] },
      hayDatos: false,
      mensaje: "No hay datos suficientes para prever este mes.",
    };
  }

  // Base estacional: mitjana ponderada del mateix mes, més pes als anys recents.
  let sumaPes = 0;
  let sumaVal = 0;
  historicoMes.forEach((p, i) => {
    const pes = i + 1; // el més recent és l'últim de la llista ordenada → més pes
    sumaPes += pes;
    sumaVal += p.entradas * pes;
  });
  const baseEstacional = sumaVal / sumaPes;

  // Tendència interanual, només amb els anys usables (l'any en curs i els incomplets la falsejarien).
  const factorTendencia = tendenciaInteranual(totals, usables);

  // Ajust de calendari: dies forts del mes objectiu vs mitjana dels mateixos mesos històrics.
  const diesFortsObjectiu =
    capsDeSetmana(objetivo.año, objetivo.mesIndex) +
    festiusLaborables(objetivo.año, objetivo.mesIndex, festius);
  const diesFortsHist =
    historicoMes.reduce(
      (s, p) => s + capsDeSetmana(p.año, objetivo.mesIndex) + festiusLaborables(p.año, objetivo.mesIndex, festius),
      0
    ) / historicoMes.length;
  // Cada dia fort de més o de menys pesa poc (~4% del mes); acotat perquè no domini.
  let factorCalendari = 1;
  if (diesFortsHist > 0) {
    factorCalendari = 1 + 0.04 * (diesFortsObjectiu - diesFortsHist);
    factorCalendari = Math.min(1.15, Math.max(0.85, factorCalendari));
  }

  const central = Math.round(baseEstacional * factorTendencia * factorCalendari);

  // Horitzó: mesos entre l'últim mes amb dades reals i l'objectiu (com més lluny, menys fiable).
  const mesesVista = Math.max(1, objetivo.año * 12 + objetivo.mesIndex - ultimMes);

  const fiabilidad = calculaFiabilitat(historicoMes.map((p) => p.entradas), mesesVista);

  // El rang s'obre com menys fiable és la previsió.
  const amplada = (1 - fiabilidad.porcentaje / 100) * 0.6 + 0.05; // entre ±5% i ±47%
  const min = Math.round(central * (1 - amplada));
  const max = Math.round(central * (1 + amplada));

  return {
    hayDatos: true,
    avisoDatos,
    año: objetivo.año,
    mesIndex: objetivo.mesIndex,
    mesNombre,
    central,
    min: Math.max(0, min),
    max,
    fiabilidad,
    historico: historicoMes,
  };
}

/** El mes següent al més recent amb dades (per defecte de la pantalla). */
export function mesSeguent(ventas: VentaMensual[]): { año: number; mesIndex: number } {
  const totals = totalsPerAnyMes(ventas);
  let millor = { año: 0, mesIndex: -1 };
  for (const k of totals.keys()) {
    const [a, m] = k.split("|").map(Number);
    if (a > millor.año || (a === millor.año && m > millor.mesIndex)) millor = { año: a, mesIndex: m };
  }
  if (millor.mesIndex < 0) {
    const ara = { año: 2026, mesIndex: 0 }; // fallback estable (sense Date.now per determinisme als tests)
    return ara;
  }
  return millor.mesIndex === 11
    ? { año: millor.año + 1, mesIndex: 0 }
    : { año: millor.año, mesIndex: millor.mesIndex + 1 };
}

/** Venda amb OTA i producte, per poder desglossar la previsió i fer recomanacions. */
export type VentaDetallada = VentaMensual & { ota: string; producto: string };

const NOMS_MES_CURT = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Mitjana d'entrades de cada mes (0-11) sobre els anys usables. */
function mitjanaPerMes(ventas: VentaDetallada[], usables: number[]): number[] {
  const perAnyMes = new Map<string, number>();
  for (const v of ventas) {
    if (!usables.includes(v.año)) continue;
    const m = indexMes(v.mes);
    if (m < 0) continue;
    perAnyMes.set(`${v.año}|${m}`, (perAnyMes.get(`${v.año}|${m}`) || 0) + v.numeroEntradas);
  }
  const avg = Array(12).fill(0);
  for (let m = 0; m < 12; m++) {
    let s = 0;
    let c = 0;
    for (const a of usables) {
      const val = perAnyMes.get(`${a}|${m}`);
      if (val !== undefined) {
        s += val;
        c++;
      }
    }
    avg[m] = c ? s / c : 0;
  }
  return avg;
}

/** Reparteix la previsió central segons el pes històric de cada OTA/producte en aquest mes. */
function desglossa(
  ventas: VentaDetallada[],
  objetivo: { año: number; mesIndex: number },
  usables: number[],
  central: number,
  camp: (v: VentaDetallada) => string
): { nombre: string; valor: number }[] {
  const per = new Map<string, number>();
  let tot = 0;
  for (const v of ventas) {
    if (indexMes(v.mes) !== objetivo.mesIndex || !usables.includes(v.año)) continue;
    const k = camp(v).trim() || "General";
    per.set(k, (per.get(k) || 0) + v.numeroEntradas);
    tot += v.numeroEntradas;
  }
  if (tot <= 0) return [];
  return [...per.entries()]
    .map(([nombre, val]) => ({ nombre, valor: Math.round(central * (val / tot)) }))
    .sort((a, b) => b.valor - a.valor);
}

/** Recomanacions per al client (mai res sobre dades que falten: això és intern). */
function generaRecomendaciones(
  ventas: VentaDetallada[],
  objetivo: { año: number; mesIndex: number },
  usables: number[],
  festius: string[]
): string[] {
  const recs: string[] = [];
  const avg = mitjanaPerMes(ventas, usables);
  const ambDades = avg.map((v, i) => ({ v, i })).filter((x) => x.v > 0);

  // Mes fort i mes fluix.
  if (ambDades.length >= 3) {
    const fort = ambDades.reduce((a, b) => (b.v > a.v ? b : a));
    const fluix = ambDades.reduce((a, b) => (b.v < a.v ? b : a));
    if (fort.i === objetivo.mesIndex) {
      recs.push(`${cap(NOMS_MES_CURT[fort.i])} suele ser tu mes más fuerte: prevé reforzar personal.`);
    }
    if (fluix.i === objetivo.mesIndex) {
      recs.push(`${cap(NOMS_MES_CURT[fluix.i])} suele ser flojo: buen momento para una promoción.`);
    }
  }

  // Nota de calendari per al mes objectiu.
  const diesObj =
    capsDeSetmana(objetivo.año, objetivo.mesIndex) + festiusLaborables(objetivo.año, objetivo.mesIndex, festius);
  const historics = usables.filter((a) => a < objetivo.año);
  if (historics.length) {
    const diesHist =
      historics.reduce(
        (s, a) => s + capsDeSetmana(a, objetivo.mesIndex) + festiusLaborables(a, objetivo.mesIndex, festius),
        0
      ) / historics.length;
    const dif = Math.round(diesObj - diesHist);
    if (dif >= 1) recs.push(`Este ${NOMS_MES_CURT[objetivo.mesIndex]} tiene más días fuertes (findes/festivos) que la media: ligero empujón esperado.`);
    else if (dif <= -1) recs.push(`Este ${NOMS_MES_CURT[objetivo.mesIndex]} tiene menos días fuertes que la media: puede quedar algo por debajo.`);
  }

  // Impuls d'una OTA: comparar les dues darreres anualitats usables.
  if (usables.length >= 2) {
    const [a1, a2] = usables.slice(-2);
    const totOta = (año: number) => {
      const m = new Map<string, number>();
      for (const v of ventas) if (v.año === año) m.set(v.ota, (m.get(v.ota) || 0) + v.numeroEntradas);
      return m;
    };
    const prev = totOta(a1);
    const act = totOta(a2);
    let millor: { ota: string; pct: number } | null = null;
    for (const [ota, va] of act) {
      const vp = prev.get(ota) || 0;
      if (vp < 20) continue; // ignorar OTAs residuals
      const pct = Math.round((100 * (va - vp)) / vp);
      if (pct >= 15 && (!millor || pct > millor.pct)) millor = { ota, pct };
    }
    if (millor) recs.push(`${millor.ota} es tu canal con más impulso (+${millor.pct}% interanual).`);
  }

  return recs;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type AnalisiPrevisio = {
  prevision: Prevision;
  desglose: { porOta: { nombre: string; valor: number }[]; porProducto: { nombre: string; valor: number }[] };
  recomendaciones: string[];
};

/**
 * Anàlisi completa d'un client: previsió del mes objectiu (o el següent), desglossament i recomanacions.
 * L'API només ha de cridar això.
 */
export function analitzaClient(
  ventas: VentaDetallada[],
  festius: string[] = [],
  objetivoOpt?: { año: number; mesIndex: number }
): AnalisiPrevisio {
  const objetivo = objetivoOpt ?? mesSeguent(ventas);
  const prevision = preveuMes(ventas, objetivo, festius);

  if (!prevision.hayDatos) {
    return { prevision, desglose: { porOta: [], porProducto: [] }, recomendaciones: [] };
  }

  const totals = totalsPerAnyMes(ventas);
  const anys = [...new Set(ventas.map((v) => v.año))].filter(Boolean).sort();
  let ultimMes = -1;
  for (const k of totals.keys()) {
    const [a, m] = k.split("|").map(Number);
    ultimMes = Math.max(ultimMes, a * 12 + m);
  }
  const { usables } = seleccionaAnys(totals, anys, ultimMes);

  return {
    prevision,
    desglose: {
      porOta: desglossa(ventas, objetivo, usables, prevision.central, (v) => v.ota),
      porProducto: desglossa(ventas, objetivo, usables, prevision.central, (v) => v.producto),
    },
    recomendaciones: generaRecomendaciones(ventas, objetivo, usables, festius),
  };
}
