import { randomInt } from "crypto";

/**
 * Alfabet sense caràcters que es confonen en llegir-los en veu alta o copiar-los d'un correu:
 * ni 0/O, ni 1/l/I. Les contrasenyes es passen als museus per escrit, i una "l" que era una "1"
 * acaba en un "no puc entrar".
 */
const LLETRES = "abcdefghijkmnpqrstuvwxyz";
const MAJUSCULES = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMEROS = "23456789";
const TOT = LLETRES + MAJUSCULES + NUMEROS;

/**
 * Contrasenya aleatòria per a un client nou.
 *
 * `randomInt` de crypto, no Math.random: les contrasenyes s'han de poder generar sense que ningú
 * pugui endevinar la següent a partir de l'anterior.
 */
export function generaPassword(longitud = 12): string {
  // Ens assegurem que hi hagi de cada mena, o pot sortir una contrasenya només de lletres.
  const obligatoris = [
    LLETRES[randomInt(LLETRES.length)],
    MAJUSCULES[randomInt(MAJUSCULES.length)],
    NUMEROS[randomInt(NUMEROS.length)],
  ];
  const resta = Array.from({ length: Math.max(0, longitud - obligatoris.length) }, () => TOT[randomInt(TOT.length)]);
  const chars = [...obligatoris, ...resta];

  // Barreja Fisher-Yates, perquè si no els obligatoris sempre serien els tres primers.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
