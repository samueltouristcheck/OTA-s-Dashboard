/**
 * Regles sobre el nom de client de les vendes.
 * S'apliquen a totes les lectures (stats, dades, llista de clients, sync) i a la migració.
 */

/** Clau de comparació: sense majúscules, accents ni espais als extrems. */
export function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Clients de qui es guarden les vendes però que no tenen perfil: no surten a la llista de clients
 * del dashboard ni hi poden entrar. A la base de dades són els que tenen `activo = false`.
 */
const SENSE_PERFIL = new Set(
  [
    "Castell d'Hostalric",
    // El full de respostes en diu "Museu de l'Art Prohibit" i els Excels "Museu d'Art Prohibit".
    "Museu de l'Art Prohibit",
    "Museu d'Art Prohibit",
    "Fundació Miró",
  ].map((x) => normKey(x))
);

/**
 * Variants que es fusionen en un nom canònic (Museu Tàpies + Fundació Tàpies).
 * Les claus es comparen amb normKey (sense accents).
 */
const ALIAS_CANONIC: Record<string, string> = {
  "museu tapies": "Fundació Tàpies",
  "fundacio tapies": "Fundació Tàpies",
  // A la fulla de vendes el Museu Egipci s'apunta amb les sigles EGI.
  egi: "Museu Egipci",
  "museu egipci": "Museu Egipci",
  // A la fulla conviuen "VINSEUM" i "Vinseum": són el mateix client.
  vinseum: "Vinseum",
  // Mateixa sigla (BNAU): al 2024 se'n deia Bus Nàutic i del 2025 endavant, Alsa.
  "bus nautic": "Alsa",
};

/**
 * Ids sintètics de /api/sheets/clientes: es generen com a `cliente-${índex}` i no existeixen a la base
 * de dades. El patró ha de ser numèric: hi ha clients reals amb ids com "cliente-golondrinas" i
 * "cliente-mapfre" que sí que són vàlids.
 */
export function esIdSinteticDeSheets(value: string): boolean {
  return /^cliente-\d+$/.test(String(value).trim());
}

/** Nom canònic del client. Retorna null només si el nom és buit. */
export function canonicalitzaNomClient(cliente: string): string | null {
  const t = cliente.trim();
  if (!t) return null;
  return ALIAS_CANONIC[normKey(t)] ?? t;
}

/** Si el client no ha de tenir perfil al dashboard (les vendes sí que es guarden). */
export function clientSensePerfil(cliente: string): boolean {
  return SENSE_PERFIL.has(normKey(cliente));
}

/**
 * Nom canònic per a les lectures del dashboard: null si el client no hi ha de sortir.
 * La migració, en canvi, fa servir {@link canonicalitzaNomClient} i marca `activo = false`.
 */
export function normalitzaClientSheet(cliente: string): string | null {
  const nom = canonicalitzaNomClient(cliente);
  if (!nom) return null;
  return clientSensePerfil(nom) ? null : nom;
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
