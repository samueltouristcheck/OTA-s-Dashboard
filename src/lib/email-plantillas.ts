/** Constantes de correo seguras para el cliente (sin dependencias de servidor). */

export type Idioma = "es" | "ca" | "en";

export const IDIOMAS: { value: Idioma; label: string }[] = [
  { value: "es", label: "Castellano" },
  { value: "ca", label: "Català" },
  { value: "en", label: "English" },
];

/** Asunto y cuerpo por defecto en cada idioma. El SuperAdmin puede editarlos. */
export const PLANTILLAS: Record<Idioma, { asunto: string; cuerpo: string }> = {
  es: {
    asunto: "Tus ventas del mes pasado ya están disponibles",
    cuerpo:
      "Buenos días,\n\nYa puedes visualizar las ventas del mes pasado en tu Dashboard personal.\n\nUn saludo,\nAlexandra",
  },
  ca: {
    asunto: "Les teves vendes del mes passat ja estan disponibles",
    cuerpo:
      "Bon dia,\n\nJa pots visualitzar les vendes del mes passat al teu Dashboard personal.\n\nUna salutació,\nAlexandra",
  },
  en: {
    asunto: "Your last month's sales are now available",
    cuerpo:
      "Good morning,\n\nYou can now view last month's sales in your personal Dashboard.\n\nKind regards,\nAlexandra",
  },
};
