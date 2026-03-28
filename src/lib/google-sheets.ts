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

// Columna de producto por cliente: Golondrinas=H(7), Big Fun=J(9)
const CLIENTE_PRODUCTO_COLUMNS: Record<string, number> = {
  golondrinas: 7,
  "big fun": 9,
};

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

function parseRow(row: string[], indices: Record<string, number>): SheetRow | null {
  const get = (k: string) => {
    const i = indices[k];
    return i >= 0 ? String(row[i] ?? "").trim() : "";
  };

  const cliente = get("cliente");
  const ota = get("ota");
  const numeroEntradas = parseInt(get("numeroEntradas") || "0", 10);

  if (!cliente || !ota || isNaN(numeroEntradas)) return null;

  const año = parseInt(get("año") || String(new Date().getFullYear()), 10);

  // Producto: columna específica por cliente (Golondrinas=H, Big Fun=J, Alsa=L) o columna "Producto" por defecto
  let producto = get("producto");
  const clienteNorm = cliente.toLowerCase().trim();
  const colProducto =
    CLIENTE_PRODUCTO_COLUMNS[clienteNorm] ??
    Object.entries(CLIENTE_PRODUCTO_COLUMNS).find(([k]) => clienteNorm.includes(k))?.[1];
  if (colProducto !== undefined && row[colProducto] !== undefined) {
    const val = String(row[colProducto] ?? "").trim();
    if (val) producto = val;
  }

  return {
    cliente,
    ota,
    tipoEntrada: get("tipoEntrada") || "General",
    mes: get("mes") || "01. Enero",
    año,
    numeroEntradas,
    producto: producto || "General",
  };
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
    const parsed = parseRow(rows[i], indices);
    if (!parsed) continue;
    const clienteOk = normalitzaClientSheet(parsed.cliente);
    if (!clienteOk) continue;
    parsed.cliente = clienteOk;
    data.push(parsed);
  }

  return data;
}
