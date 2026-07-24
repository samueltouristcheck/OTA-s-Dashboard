/**
 * Festius de Catalunya (+ la Mercè, festiu local de Barcelona), per a l'ajust de calendari de la
 * previsió. Només s'usa per comptar "dies forts" del mes, així que n'hi ha prou amb els festius
 * estatals i catalans; els festius locals d'altres municipis afegirien poc.
 */

// Festius de data fixa (mes-dia), cada any.
const FIXOS = [
  "01-01", // Cap d'Any
  "01-06", // Reis
  "05-01", // Festa del Treball
  "06-24", // Sant Joan
  "08-15", // l'Assumpció
  "09-11", // Diada de Catalunya
  "09-24", // la Mercè (Barcelona)
  "10-12", // Festa Nacional d'Espanya
  "11-01", // Tots Sants
  "12-06", // Dia de la Constitució
  "12-08", // la Immaculada
  "12-25", // Nadal
  "12-26", // Sant Esteve (Catalunya)
];

// Divendres Sant i Dilluns de Pasqua (dates variables), per any.
const PASQUA: Record<number, string[]> = {
  2024: ["03-29", "04-01"],
  2025: ["04-18", "04-21"],
  2026: ["04-03", "04-06"],
  2027: ["03-26", "03-29"],
};

/** Llista "YYYY-MM-DD" dels festius entre dos anys (tots dos inclosos). */
export function festiusDe(desde: number, hasta: number): string[] {
  const out: string[] = [];
  for (let any = desde; any <= hasta; any++) {
    for (const md of FIXOS) out.push(`${any}-${md}`);
    for (const md of PASQUA[any] ?? []) out.push(`${any}-${md}`);
  }
  return out;
}
