import { normalitzaClientSheet } from "./clientes-sheet";

/**
 * Colors opcionals per client (dashboard client).
 * Omple amb els hex de la identitat de cada web; es poden afegir més claus amb el nom canònic del client.
 */
export type ClienteTheme = { primary: string; soft: string };

export const CLIENTE_THEME: Record<string, ClienteTheme> = {
  "Fundació Tàpies": { primary: "#0f172a", soft: "#f1f5f9" },
  // Exemples (personalitza amb colors reals de cada web):
  // Golondrinas: { primary: "#0369a1", soft: "#f0f9ff" },
};

export function getClientTheme(clienteNombre: string | undefined): ClienteTheme | null {
  if (!clienteNombre) return null;
  const canon = normalitzaClientSheet(clienteNombre) ?? clienteNombre.trim();
  return CLIENTE_THEME[canon] ?? null;
}
