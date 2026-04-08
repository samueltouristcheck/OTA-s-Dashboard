/**
 * Regles sobre el nom de client a la columna "Cliente" de Google Sheets.
 * S'aplica a totes les lectures de la fulla (stats, dades, llista de clients, sync).
 */

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Clients que no s'han de mostrar ni comptabilitzar. */
const EXCLUITS = new Set(
  ["Castell d'Hostalric", "Museu de l'Art Prohibit", "Fundació Miró", "Alsa"].map((x) => normKey(x))
);

/**
 * Variants que es fusionen en un nom canònic (Museu Tàpies + Fundació Tàpies).
 * Les claus es comparen amb normKey (sense accents).
 */
const ALIAS_CANONIC: Record<string, string> = {
  "museu tapies": "Fundació Tàpies",
  "fundacio tapies": "Fundació Tàpies",
};

export function normalitzaClientSheet(cliente: string): string | null {
  const t = cliente.trim();
  if (!t) return null;
  const k = normKey(t);
  if (EXCLUITS.has(k)) return null;
  if (ALIAS_CANONIC[k]) return ALIAS_CANONIC[k];
  return t;
}

/**
 * Compara el nom de client de la fila (ja canònic després d'importar la fulla) amb el del token o la BD.
 * Museu Tàpies i Fundació Tàpies han de coincidir (mateixa normalització que {@link normalitzaClientSheet}).
 */
export function clienteSheetsEquiv(rowCliente: string, filterCliente: string): boolean {
  const r = normalitzaClientSheet(rowCliente) ?? rowCliente.trim();
  const f = normalitzaClientSheet(filterCliente) ?? filterCliente.trim();
  if (!r || !f) return false;
  return r.toLowerCase() === f.toLowerCase();
}
