import type OpenAI from "openai";
import { BOT_NAME } from "./bot";

/** Modelo de OpenAI usado por el chatbot.
 *  gpt-4o-mini es muy barato y rápido, de sobra para consultas de datos.
 *  Si quieres respuestas más elaboradas cambia a "gpt-4o". */
export const CHATBOT_MODEL = "gpt-4o-mini";

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

/** Una fila de Venta tal y como vive en Supabase (columna "ano", no "anio"). */
export type VentaRow = {
  ano: number;
  mes: string;
  ota: string;
  tipoEntrada: string;
  producto: string;
  numeroEntradas: number;
  clienteNombre?: string;
};

const norm = (s: string) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const mesSinPrefijo = (m: string) => norm(m).replace(/^\d+\.\s*/, "");

/** Catálogo de valores disponibles para el ámbito (cliente o global). */
export function filterOptions(rows: VentaRow[]) {
  const uniq = (arr: (string | number)[]) => [...new Set(arr.filter((v) => v !== "" && v != null))];
  const mesesSet = new Set(rows.map((r) => r.mes));
  return {
    años: (uniq(rows.map((r) => r.ano)) as number[]).sort((a, b) => b - a),
    meses: MES_ORDER.filter((m) => mesesSet.has(m)),
    otas: (uniq(rows.map((r) => String(r.ota || "").trim())) as string[]).sort(),
    tipos: (uniq(rows.map((r) => String(r.tipoEntrada || "").trim())) as string[]).sort(),
    productos: (uniq(rows.map((r) => String(r.producto || "").trim())) as string[]).sort(),
    clientes: (uniq(rows.map((r) => String(r.clienteNombre || "").trim())) as string[]).sort(),
  };
}

type ConsultaInput = {
  años?: number[];
  meses?: string[];
  otas?: string[];
  tipos?: string[];
  productos?: string[];
  clientes?: string[];
  agrupar_por?: "año" | "mes" | "ota" | "tipo" | "producto" | "cliente" | "total";
};

/** La herramienta (function calling) que el modelo puede invocar para consultar los datos. */
export const consultarVentasTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "consultar_ventas",
    description:
      "Consulta el número de entradas vendidas, con filtros opcionales y una agrupación. " +
      "Úsala para totales, rankings y comparativas (llamándola una vez por cada periodo a comparar, " +
      "o agrupando por la dimensión a comparar). Devuelve el total y el desglose por la dimensión pedida. " +
      "Si no filtras por una dimensión, se incluyen todos sus valores.",
    parameters: {
      type: "object",
      properties: {
        años: { type: "array", items: { type: "number" }, description: "Años a incluir, ej. [2024, 2023]" },
        meses: {
          type: "array",
          items: { type: "string" },
          description: 'Meses a incluir, por nombre. Ej. ["Enero", "Julio"]',
        },
        otas: { type: "array", items: { type: "string" }, description: 'OTAs a incluir, ej. ["Tiqets"]' },
        tipos: { type: "array", items: { type: "string" }, description: "Tipos de entrada a incluir" },
        productos: { type: "array", items: { type: "string" }, description: "Productos a incluir" },
        clientes: {
          type: "array",
          items: { type: "string" },
          description: "Solo admin: clientes a incluir. Un cliente solo ve sus propios datos.",
        },
        agrupar_por: {
          type: "string",
          enum: ["año", "mes", "ota", "tipo", "producto", "cliente", "total"],
          description: "Dimensión por la que desglosar el resultado. 'total' devuelve solo la suma.",
        },
      },
      required: [],
    },
  },
};

/** Ejecuta la consulta sobre las filas ya acotadas al ámbito del usuario. */
export function consultarVentas(rows: VentaRow[], input: ConsultaInput) {
  const años = input.años?.length ? new Set(input.años.map(Number)) : null;
  const meses = input.meses?.length ? new Set(input.meses.map(mesSinPrefijo)) : null;
  const otas = input.otas?.length ? new Set(input.otas.map(norm)) : null;
  const tipos = input.tipos?.length ? new Set(input.tipos.map(norm)) : null;
  const productos = input.productos?.length ? new Set(input.productos.map(norm)) : null;
  const clientes = input.clientes?.length ? new Set(input.clientes.map(norm)) : null;

  const filtered = rows.filter((r) => {
    if (años && !años.has(Number(r.ano))) return false;
    if (meses && !meses.has(mesSinPrefijo(r.mes))) return false;
    if (otas && !otas.has(norm(r.ota))) return false;
    if (tipos && !tipos.has(norm(r.tipoEntrada))) return false;
    if (productos && !productos.has(norm(r.producto))) return false;
    if (clientes && !clientes.has(norm(r.clienteNombre || ""))) return false;
    return true;
  });

  const groupBy = input.agrupar_por || "total";
  const keyOf = (r: VentaRow): string => {
    switch (groupBy) {
      case "año":
        return String(r.ano);
      case "mes":
        return r.mes;
      case "ota":
        return r.ota || "(sin OTA)";
      case "tipo":
        return r.tipoEntrada || "(sin tipo)";
      case "producto":
        return r.producto || "(sin producto)";
      case "cliente":
        return r.clienteNombre || "(sin cliente)";
      default:
        return "total";
    }
  };

  let total = 0;
  const desglose: Record<string, number> = {};
  for (const r of filtered) {
    const n = Number(r.numeroEntradas) || 0;
    total += n;
    const k = keyOf(r);
    desglose[k] = (desglose[k] || 0) + n;
  }

  // Ordena el desglose: meses por orden natural, el resto por valor descendente.
  let entries = Object.entries(desglose);
  if (groupBy === "mes") {
    entries.sort((a, b) => MES_ORDER.indexOf(a[0]) - MES_ORDER.indexOf(b[0]));
  } else if (groupBy === "año") {
    entries.sort((a, b) => Number(a[0]) - Number(b[0]));
  } else if (groupBy !== "total") {
    entries.sort((a, b) => b[1] - a[1]);
  }

  return {
    total,
    num_registros: filtered.length,
    agrupado_por: groupBy,
    desglose: Object.fromEntries(entries),
  };
}

/** Construye el prompt del sistema con el ámbito y el catálogo de datos. */
export function buildSystemPrompt(opts: {
  esAdmin: boolean;
  clienteNombre?: string;
  options: ReturnType<typeof filterOptions>;
}): string {
  const { esAdmin, clienteNombre, options } = opts;
  const ambito = esAdmin
    ? "Eres el asistente de un administrador, que puede ver los datos de TODOS los clientes."
    : `Eres el asistente del cliente "${clienteNombre}". SOLO tienes acceso a los datos de este cliente; nunca menciones ni inventes datos de otros clientes.`;

  const cat = (label: string, arr: (string | number)[]) =>
    arr.length ? `- ${label}: ${arr.join(", ")}` : `- ${label}: (sin datos)`;

  return [
    `Te llamas ${BOT_NAME}. Eres un asistente de análisis de ventas de entradas de museos/atracciones vendidas a través de OTAs (agencias online).`,
    ambito,
    "",
    "Las ventas se miden en NÚMERO DE ENTRADAS. Cuando necesites datos, usa SIEMPRE la herramienta `consultar_ventas`; no inventes cifras.",
    "Para comparar periodos (años, meses...), agrupa por esa dimensión en una sola llamada, o haz una llamada por periodo.",
    "Responde en español, de forma breve y clara. Da las cifras formateadas (ej. 1.234) y, cuando compares, calcula la diferencia absoluta y el % de variación.",
    "Si te preguntan algo fuera de los datos de ventas disponibles, dilo con naturalidad.",
    "",
    "Catálogo de datos disponibles (úsalo para entender qué se puede consultar y para corregir nombres mal escritos):",
    cat("Años", options.años),
    cat("Meses", options.meses),
    cat("OTAs", options.otas),
    cat("Tipos de entrada", options.tipos),
    cat("Productos", options.productos),
    esAdmin ? cat("Clientes", options.clientes) : "",
  ]
    .filter(Boolean)
    .join("\n");
}
