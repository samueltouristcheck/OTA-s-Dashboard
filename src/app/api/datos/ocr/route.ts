import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyToken } from "@/lib/auth";
import { MES_ORDER } from "@/lib/stats";

export const dynamic = "force-dynamic";

// gpt-4o (no mini): llegeix taules i xifres amb molta més precisió que el mini.
const MODEL = "gpt-4o";

/**
 * Llegeix una captura o foto amb una taula de vendes i n'extreu les files, perquè l'Alexandra les revisi
 * abans de carregar-les. NO desa res: només proposa. El desat el fa la pantalla contra /api/ventas/celdas
 * després que ella confirmi.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Falta OPENAI_API_KEY en el servidor." }, { status: 503 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const ano = String(form.get("ano") || "").trim();
    const cliente = String(form.get("cliente") || "").trim();
    if (!file) return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "De momento solo imágenes (captura o foto). Para Excel/CSV usa la importación." }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Imagen demasiado grande (máx. 8 MB)." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const sistema = [
      "Eres un asistente que lee capturas o fotos de tablas de ventas de entradas y extrae los datos.",
      `Contexto: los datos son del cliente "${cliente || "(desconocido)"}" y del año ${ano || "(el que indique la imagen)"}.`,
      "IMPORTANTE — formato de la tabla: normalmente es ANCHA. Cada fila empieza con OTA, Producto y Tipo,",
      "y luego trae los 12 MESES en columnas (ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC, o Enero...Diciembre).",
      "Para CADA fila, recorre las 12 columnas de meses de izquierda a derecha y crea UNA entrada por cada celda",
      "que tenga un número mayor que 0. Lee columna por columna con cuidado y no te saltes ninguna celda con número.",
      "Ignora la columna 'TOTAL' (o 'Total'): es la suma, NO un mes.",
      "Devuelve SOLO un JSON con esta forma exacta:",
      '{ "filas": [ { "ota": string, "producto": string, "tipoEntrada": string, "mes": string, "numeroEntradas": number } ] }',
      "Reglas:",
      `- "mes" debe ser uno de: ${MES_ORDER.join(", ")}. La columna 1 es "01. Enero", la 2 "02. Febrero", etc. Respeta la posición de la columna.`,
      '- "tipoEntrada": General, Niño, Reducido, ADULT, KIDS, INFANT... lo que ponga; si no hay, usa "General".',
      '- "producto": el producto/entrada de esa fila (p. ej. "Ticket", "Combo Zoo + Aquàrium"); si no hay, "General". Copia el nombre completo aunque sea largo.',
      '- "ota": el canal/OTA (Fever, GetYourGuide, Tiqets, Headout...). Si una fila no lo repite pero pertenece al mismo bloque que la de arriba, usa la misma OTA.',
      "- numeroEntradas: entero. NO inventes números; extrae solo lo que se vea. Omite celdas vacías, con guion (—) o a 0.",
      "- Sé EXHAUSTIVO: extrae TODAS las filas y TODOS los meses con número, no solo los primeros. Es mejor muchas entradas que dejarte datos.",
      "- Si no reconoces la tabla o no hay datos claros, devuelve filas vacías.",
    ].join("\n");

    const resp = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 16000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sistema },
        {
          role: "user",
          content: [
            { type: "text", text: "Extrae las ventas de esta imagen." },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
    });

    const raw = resp.choices[0]?.message?.content || "{}";
    let parsed: { filas?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "No he podido leer la imagen. Prueba con una captura más nítida." }, { status: 422 });
    }

    // Validació i neteja: mai confiem cegament del que torna el model.
    const filas = Array.isArray(parsed.filas) ? parsed.filas : [];
    const netes = filas
      .map((f) => {
        const r = f as Record<string, unknown>;
        const mes = String(r.mes ?? "").trim();
        const n = parseInt(String(r.numeroEntradas ?? ""), 10);
        return {
          ota: String(r.ota ?? "").trim(),
          producto: String(r.producto ?? "").trim() || "General",
          tipoEntrada: String(r.tipoEntrada ?? "").trim() || "General",
          mes,
          numeroEntradas: n,
        };
      })
      .filter((f) => MES_ORDER.includes(f.mes) && Number.isInteger(f.numeroEntradas) && f.numeroEntradas > 0);

    return NextResponse.json({ filas: netes }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al leer la imagen" }, { status: 500 });
  }
}
