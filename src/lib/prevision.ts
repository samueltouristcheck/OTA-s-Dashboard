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

/**
 * Detecta un any que sembla incomplet: el darrer any tancat (no el que està en curs) cau més d'un 45%
 * respecte de l'anterior. Podria ser una caiguda real de vendes, però gairebé sempre és que falta entrar
 * dades — i en tots dos casos convé mirar-s'ho abans de fiar-se de la previsió.
 */
function detectaDadesIncompletes(totals: Map<string, number>, anys: number[], ultimMesAbs: number): string | undefined {
  if (anys.length < 2) return undefined;
  const ultimAny = anys[anys.length - 1];
  // Si el darrer any encara està en curs (l'últim mes amb dades no és desembre), el saltem.
  const enCurs = ultimMesAbs % 12 < 11 && Math.floor(ultimMesAbs / 12) === ultimAny;
  const anysTancats = enCurs ? anys.slice(0, -1) : anys;
  if (anysTancats.length < 2) return undefined;

  const a = anysTancats[anysTancats.length - 1];
  const previ = anysTancats[anysTancats.length - 2];
  const totalA = totalAny(totals, a);
  const totalPrevi = totalAny(totals, previ);
  if (totalPrevi > 0 && totalA < totalPrevi * 0.55) {
    return `Los datos de ${a} parecen incompletos (caen mucho respecto a ${previ}). Revisa que estén todas las ventas antes de fiarte de la previsión.`;
  }
  return undefined;
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

  const base: Omit<Prevision, "central" | "min" | "max" | "fiabilidad"> & {
    central?: number;
  } = {
    hayDatos: false,
    año: objetivo.año,
    mesIndex: objetivo.mesIndex,
    mesNombre,
    historico: [],
  };

  // Valors del mateix mes en anys anteriors a l'objectiu.
  const historicoMes = anys
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

  // Tendència interanual.
  const factorTendencia = tendenciaInteranual(totals, anys);

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
  let ultimMes = -1;
  for (const k of totals.keys()) {
    const [a, m] = k.split("|").map(Number);
    const abs = a * 12 + m;
    if (abs > ultimMes) ultimMes = abs;
  }
  const mesesVista = Math.max(1, objetivo.año * 12 + objetivo.mesIndex - ultimMes);

  const fiabilidad = calculaFiabilitat(historicoMes.map((p) => p.entradas), mesesVista);

  // El rang s'obre com menys fiable és la previsió.
  const amplada = (1 - fiabilidad.porcentaje / 100) * 0.6 + 0.05; // entre ±5% i ±47%
  const min = Math.round(central * (1 - amplada));
  const max = Math.round(central * (1 + amplada));

  return {
    hayDatos: true,
    avisoDatos: detectaDadesIncompletes(totals, anys, ultimMes),
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
