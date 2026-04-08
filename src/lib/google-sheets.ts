import { google } from "googleapis";
import { normalitzaClientSheet } from "@/lib/clientes-sheet";

export type SheetRow = {
  cliente: string;
  ota: string;
  tipoEntrada: string;
  mes: string;
  año: number;
  numeroEntradas: number;
  producto: string;
};

const COLUMN_MAP: Record<string, string> = {
  cliente: "Cliente",
  ota: "OTA",
  tipoEntrada: "Tipo de Entrada",
  mes: "Mes respuesta",
  año: "Año",
  numeroEntradas: "Número de entradas",
  producto: "Producto",
};

const COLUMN_ALIASES: Record<string, string[]> = {
  numeroEntradas: ["Número de entradas", "Numero de entradas", "numeroEntradas", "entradas"],
};

// Columna de text "producte" per client (una sola columna): Golondrinas=H(7)
const CLIENTE_PRODUCTO_COLUMNS: Record<string, number> = {
  golondrinas: 7,
};

/** Big Fun: tres columnes d'entrades per producte (J,K,L = índex 9,10,11). La fila 0 té els títols. */
const BIG_FUN_PRODUCT_COLS = [9, 10, 11] as const;
const BIG_FUN_DEFAULT_PRODUCT_NAMES = [
  "Big Fun",
  "Museu de les Il·lusions",
  "Combo",
] as const;

function isBigFunCliente(clienteNorm: string) {
  return clienteNorm.includes("big fun");
}

/** MAPFRE: dues columnes J,K (9,10) per Kbr i Sala Recoletos (mateixa idea que Big Fun). */
const MAPFRE_PRODUCT_COLS = [9, 10] as const;
const MAPFRE_DEFAULT_PRODUCT_NAMES = ["Kbr", "Sala Recoletos"] as const;

function isMapfreCliente(clienteNorm: string) {
  return clienteNorm.includes("mapfre");
}

function expandMapfreProductRows(
  row: string[],
  headers: string[],
  base: Omit<SheetRow, "producto" | "numeroEntradas">
): SheetRow[] {
  const outs: SheetRow[] = [];
  for (let i = 0; i < MAPFRE_PRODUCT_COLS.length; i++) {
    const col = MAPFRE_PRODUCT_COLS[i];
    const n = parseIntCell(row[col]);
    if (n <= 0) continue;
    const fromHeader = String(headers[col] ?? "").trim();
    const producto = fromHeader || MAPFRE_DEFAULT_PRODUCT_NAMES[i] || `Producte ${i + 1}`;
    outs.push({
      ...base,
      numeroEntradas: n,
      producto,
    });
  }
  return outs;
}

/** Museu d'Art de Girona: dues columnes J,K (9,10) — Girona Episcopal i Museu d'Art de Girona. */
const GIRONA_ART_PRODUCT_COLS = [9, 10] as const;
const GIRONA_ART_DEFAULT_PRODUCT_NAMES = ["Girona Episcopal", "Museu d'Art de Girona"] as const;

function isGironaArtCliente(clienteNorm: string) {
  const n = clienteNorm;
  return n.includes("girona") && n.includes("art") && n.includes("museu");
}

function expandGironaArtProductRows(
  row: string[],
  headers: string[],
  base: Omit<SheetRow, "producto" | "numeroEntradas">
): SheetRow[] {
  const outs: SheetRow[] = [];
  for (let i = 0; i < GIRONA_ART_PRODUCT_COLS.length; i++) {
    const col = GIRONA_ART_PRODUCT_COLS[i];
    const n = parseIntCell(row[col]);
    if (n <= 0) continue;
    const fromHeader = String(headers[col] ?? "").trim();
    const producto = fromHeader || GIRONA_ART_DEFAULT_PRODUCT_NAMES[i] || `Producte ${i + 1}`;
    outs.push({
      ...base,
      numeroEntradas: n,
      producto,
    });
  }
  return outs;
}

function findColumnIndex(headers: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, colName] of Object.entries(COLUMN_MAP)) {
    const names = [colName, ...(COLUMN_ALIASES[key] || [])];
    const idx = headers.findIndex((h) => {
      const norm = (h ?? "").toLowerCase().trim();
      return names.some((n) => norm === n.toLowerCase().trim());
    });
    if (idx >= 0) result[key] = idx;
  }
  return result;
}

function parseIntCell(raw: string | undefined): number {
  const n = parseInt(String(raw ?? "").replace(/\s/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Big Fun: una fila de fulla pot portar entrades repartides en J,K,L (un producte per columna).
 * Retorna una fila per cada columna amb entradas > 0. Si cap columna té xifres, una sola fila (comportament antic).
 */
function expandBigFunProductRows(
  row: string[],
  headers: string[],
  base: Omit<SheetRow, "producto" | "numeroEntradas">
): SheetRow[] {
  const outs: SheetRow[] = [];
  for (let i = 0; i < BIG_FUN_PRODUCT_COLS.length; i++) {
    const col = BIG_FUN_PRODUCT_COLS[i];
    const n = parseIntCell(row[col]);
    if (n <= 0) continue;
    const fromHeader = String(headers[col] ?? "").trim();
    const producto =
      fromHeader ||
      BIG_FUN_DEFAULT_PRODUCT_NAMES[i] ||
      `Producte ${i + 1}`;
    outs.push({
      ...base,
      numeroEntradas: n,
      producto,
    });
  }
  return outs;
}

function parseRow(row: string[], indices: Record<string, number>, headers: string[]): SheetRow[] {
  const get = (k: string) => {
    const i = indices[k];
    return i >= 0 ? String(row[i] ?? "").trim() : "";
  };

  const cliente = get("cliente");
  const ota = get("ota");
  if (!cliente || !ota) return [];

  const clienteNorm = cliente.toLowerCase().trim();
  const numMain = parseInt(get("numeroEntradas") || "", 10);

  const año = parseInt(get("año") || String(new Date().getFullYear()), 10);

  const baseCommon = {
    cliente,
    ota,
    tipoEntrada: get("tipoEntrada") || "General",
    mes: get("mes") || "01. Enero",
    año,
  };

  // Big Fun: columnes J,K,L amb entrades per producte (o columna principal si no hi ha repartiment)
  if (isBigFunCliente(clienteNorm)) {
    const expanded = expandBigFunProductRows(row, headers, baseCommon);
    if (expanded.length > 0) return expanded;

    // Cap número a J,K,L: una sola fila amb total de "Número de entradas" i producte text (Producto / columna J)
    if (isNaN(numMain) || numMain <= 0) return [];

    let producto = get("producto");
    const colJ = 9;
    if (row[colJ] !== undefined) {
      const val = String(row[colJ] ?? "").trim();
      if (val && !/^\d+$/.test(val.replace(/\s/g, ""))) producto = val;
    }

    return [
      {
        ...baseCommon,
        numeroEntradas: numMain,
        producto: producto || "General",
      },
    ];
  }

  // MAPFRE: columnes J,K amb entrades per Kbr / Sala Recoletos (o columna "Producto" si no hi ha repartiment)
  if (isMapfreCliente(clienteNorm)) {
    const expanded = expandMapfreProductRows(row, headers, baseCommon);
    if (expanded.length > 0) return expanded;

    if (isNaN(numMain) || numMain <= 0) return [];

    let producto = get("producto");
    const colJ = 9;
    if (row[colJ] !== undefined) {
      const val = String(row[colJ] ?? "").trim();
      if (val && !/^\d+$/.test(val.replace(/\s/g, ""))) producto = val;
    }

    return [
      {
        ...baseCommon,
        numeroEntradas: numMain,
        producto: producto || "General",
      },
    ];
  }

  // Museu d'Art de Girona: dues columnes J,K (mateix esquema que MAPFRE)
  if (isGironaArtCliente(clienteNorm)) {
    const expanded = expandGironaArtProductRows(row, headers, baseCommon);
    if (expanded.length > 0) return expanded;

    if (isNaN(numMain) || numMain <= 0) return [];

    let producto = get("producto");
    const colJ = 9;
    if (row[colJ] !== undefined) {
      const val = String(row[colJ] ?? "").trim();
      if (val && !/^\d+$/.test(val.replace(/\s/g, ""))) producto = val;
    }

    return [
      {
        ...baseCommon,
        numeroEntradas: numMain,
        producto: producto || "General",
      },
    ];
  }

  // Resta de clients: una fila, total a "Número de entradas"
  if (isNaN(numMain)) return [];

  let producto = get("producto");
  const colProducto =
    CLIENTE_PRODUCTO_COLUMNS[clienteNorm] ??
    Object.entries(CLIENTE_PRODUCTO_COLUMNS).find(([k]) => clienteNorm.includes(k))?.[1];
  if (colProducto !== undefined && row[colProducto] !== undefined) {
    const val = String(row[colProducto] ?? "").trim();
    if (val) producto = val;
  }

  return [
    {
      ...baseCommon,
      numeroEntradas: numMain,
      producto: producto || "General",
    },
  ];
}

export async function fetchSheetData(
  sheetId: string,
  tabName?: string
): Promise<SheetRow[]> {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  let auth;
  if (credentialsJson) {
    let creds: Record<string, unknown>;
    try {
      const trimmed = credentialsJson.trim();
      // Si Vercel/env añadió comillas extra alrededor del JSON, quitarlas
      const toParse = trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1).replace(/\\"/g, '"') : trimmed;
      creds = JSON.parse(toParse) as Record<string, unknown>;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `GOOGLE_SERVICE_ACCOUNT_JSON inválido (${msg}). Pega el JSON completo sin comillas extra. Debe empezar con {"type":"service_account"...}`
      );
    }
    auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
  } else if (credentialsPath) {
    auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
  } else {
    throw new Error(
      "Configura GOOGLE_APPLICATION_CREDENTIALS o GOOGLE_SERVICE_ACCOUNT_JSON en .env"
    );
  }

  const range = tabName ? `'${tabName.replace(/'/g, "''")}'!A:Z` : "A:Z";

  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = response.data.values as string[][];
  if (!rows?.length) return [];

  const headers = rows[0];
  const indices = findColumnIndex(headers);
  const data: SheetRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const parsedList = parseRow(rows[i], indices, headers);
    for (const parsed of parsedList) {
      const clienteOk = normalitzaClientSheet(parsed.cliente);
      if (!clienteOk) continue;
      parsed.cliente = clienteOk;
      data.push(parsed);
    }
  }

  return data;
}
