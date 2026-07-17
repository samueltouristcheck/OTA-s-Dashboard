/**
 * Lògica compartida d'estadístiques de vendes.
 *
 * Google Sheets i la base de dades tenien cada una la seva còpia d'aquests càlculs i havien divergit
 * (filtres multi-valor, tipus d'entrada ignorat, opcions de filtre que es buidaven). Cada font només ha de
 * convertir les seves files a {@link StatsRow}, filtrar per client a la seva manera i cridar aquí.
 */

export const MES_ORDER = [
  "01. Enero",
  "02. Febrero",
  "03. Marzo",
  "04. Abril",
  "05. Mayo",
  "06. Junio",
  "07. Julio",
  "08. Agosto",
  "09. Septiembre",
  "10. Octubre",
  "11. Noviembre",
  "12. Diciembre",
];

export type StatsRow = {
  ota: string;
  tipoEntrada: string;
  mes: string;
  año: number;
  numeroEntradas: number;
  producto: string;
};

export type StatsFilters = {
  años: number[];
  meses: string[];
  otas: string[];
  tipos: string[];
  productos: string[];
};

/** Tots els filtres arriben com a llistes separades per comes ("2024,2025"). */
export function parseStatsFilters(searchParams: URLSearchParams): StatsFilters {
  const list = (key: string) => {
    const raw = searchParams.get(key);
    return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  };
  return {
    años: list("año").map((s) => parseInt(s, 10)).filter((n) => !isNaN(n)),
    meses: list("mes"),
    otas: list("ota"),
    tipos: list("tipoEntrada"),
    productos: list("producto"),
  };
}

/** La fulla escriu "06. Junio" i la UI pot enviar "Junio" (o a l'inrevés): han de coincidir igualment. */
export function mesMatches(rowMes: string, filterMes: string): boolean {
  if (!filterMes) return true;
  const rowNorm = String(rowMes || "").trim();
  const filterNorm = String(filterMes || "").trim();
  if (rowNorm === filterNorm) return true;
  const filterName = filterNorm.replace(/^\d+\.\s*/, "").trim();
  return rowNorm === filterName || rowNorm.endsWith(filterName);
}

/**
 * Dimensions que s'exclouen del propi filtre. Els gràfics de mes/OTA/tipus es calculen ignorant el filtre
 * de la seva pròpia dimensió: si no, en triar un mes els altres desapareixerien del selector.
 */
export type StatsExclude = { mes?: boolean; ota?: boolean; tipo?: boolean };

export function applyStatsFilters(
  rows: StatsRow[],
  filters: StatsFilters,
  exclude?: StatsExclude
): StatsRow[] {
  let f = rows;
  if (filters.años.length) f = f.filter((r) => filters.años.includes(r.año));
  if (filters.meses.length && !exclude?.mes) {
    f = f.filter((r) => filters.meses.some((m) => mesMatches(r.mes, m)));
  }
  if (filters.otas.length && !exclude?.ota) {
    f = f.filter((r) => filters.otas.includes(String(r.ota || "").trim()));
  }
  if (filters.tipos.length && !exclude?.tipo) {
    f = f.filter((r) => filters.tipos.includes(String(r.tipoEntrada || "").trim()));
  }
  if (filters.productos.length) {
    f = f.filter((r) => filters.productos.includes(String(r.producto || "").trim()));
  }
  return f;
}

function sumBy<K extends string | number>(
  rows: StatsRow[],
  key: (r: StatsRow) => K
): Record<K, number> {
  return rows.reduce((acc, r) => {
    const k = key(r);
    acc[k] = (acc[k] || 0) + r.numeroEntradas;
    return acc;
  }, {} as Record<K, number>);
}

export type StatsPayload = {
  total: number;
  porMes: Record<string, number>;
  porOta: Record<string, number>;
  porTipo: Record<string, number>;
  porProducto: Record<string, number>;
  porAño: Record<number, number>;
  filterOptions: {
    tipos: string[];
    otas: string[];
    años: number[];
    meses: string[];
    productos: string[];
  };
};

/**
 * @param rowsCliente files ja restringides al client corresponent. Les opcions dels filtres surten d'aquí,
 * no de les files ja filtrades, perquè els selectors han de seguir oferint tots els valors del client.
 */
export function computeStats(rowsCliente: StatsRow[], filters: StatsFilters): StatsPayload {
  const filtered = applyStatsFilters(rowsCliente, filters);

  const mesesEnDades = new Set(rowsCliente.map((r) => String(r.mes || "").trim()).filter(Boolean));
  const meses = MES_ORDER.filter(
    (m) =>
      mesesEnDades.has(m) ||
      [...mesesEnDades].some((s) => mesMatches(s, m))
  );

  return {
    total: filtered.reduce((s, r) => s + r.numeroEntradas, 0),
    porMes: sumBy(applyStatsFilters(rowsCliente, filters, { mes: true }), (r) => r.mes),
    porOta: sumBy(applyStatsFilters(rowsCliente, filters, { ota: true }), (r) => r.ota),
    porTipo: sumBy(applyStatsFilters(rowsCliente, filters, { tipo: true }), (r) => r.tipoEntrada),
    porProducto: sumBy(filtered, (r) => r.producto),
    porAño: sumBy(filtered, (r) => r.año),
    filterOptions: {
      tipos: [...new Set(rowsCliente.map((r) => String(r.tipoEntrada || "").trim()).filter(Boolean))].sort(),
      otas: [...new Set(rowsCliente.map((r) => String(r.ota || "").trim()).filter(Boolean))].sort(),
      años: [...new Set(rowsCliente.map((r) => r.año).filter(Boolean))].sort((a, b) => b - a),
      meses: meses.length ? meses : MES_ORDER,
      productos: [...new Set(rowsCliente.map((r) => String(r.producto || "").trim()).filter(Boolean))].sort(),
    },
  };
}

export type ComparativaPayload =
  | {
      tipo: "interanual";
      porAño: Record<number, { porMes: Record<string, number>; total: number; porOta: Record<string, number> }>;
      años: number[];
    }
  | { tipo: "intermensual"; porMes: Record<string, { porAño: Record<number, number>; total: number }>; meses: string[] };

/**
 * A les comparatives el filtre d'any no s'aplica al conjunt base: serveix per triar quins anys es comparen,
 * no per retallar-ne els totals.
 */
export function computeComparativa(
  rowsCliente: StatsRow[],
  filters: StatsFilters,
  comparativa: string
): ComparativaPayload | null {
  const base = applyStatsFilters(rowsCliente, { ...filters, años: [] });

  if (comparativa === "interanual") {
    let años = [...new Set(base.map((r) => r.año))].sort((a, b) => b - a);
    if (filters.años.length) años = años.filter((a) => filters.años.includes(a));
    const porAño: Record<number, { porMes: Record<string, number>; total: number; porOta: Record<string, number> }> = {};
    for (const a of años) {
      const byYear = base.filter((r) => r.año === a);
      porAño[a] = {
        porMes: sumBy(byYear, (r) => r.mes),
        porOta: sumBy(byYear, (r) => r.ota),
        total: byYear.reduce((s, r) => s + r.numeroEntradas, 0),
      };
    }
    return { tipo: "interanual", porAño, años };
  }

  if (comparativa === "intermensual") {
    const data = filters.años.length ? base.filter((r) => filters.años.includes(r.año)) : base;
    const meses = [...new Set(data.map((r) => r.mes))].sort(
      (a, b) => MES_ORDER.indexOf(a) - MES_ORDER.indexOf(b)
    );
    const porMes: Record<string, { porAño: Record<number, number>; total: number }> = {};
    for (const m of meses) {
      const byMes = data.filter((r) => mesMatches(r.mes, m));
      porMes[m] = {
        porAño: sumBy(byMes, (r) => r.año),
        total: byMes.reduce((s, r) => s + r.numeroEntradas, 0),
      };
    }
    return { tipo: "intermensual", porMes, meses };
  }

  return null;
}
