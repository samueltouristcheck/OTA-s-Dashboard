import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyToken } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { supabase } from "@/lib/supabase";
import { PLANTILLAS, IDIOMAS, type Idioma } from "@/lib/email-plantillas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authSuperAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const payload = token ? verifyToken(token) : null;
  return payload && isSuperAdmin(payload) ? payload : null;
}

type Plantilla = { asunto: string; cuerpo: string };
type Plantillas = Record<Idioma, Plantilla>;

/** Carga las plantillas guardadas, con los textos por defecto como respaldo. */
export async function GET(req: NextRequest) {
  if (!authSuperAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const merged: Plantillas = JSON.parse(JSON.stringify(PLANTILLAS));
  const { data } = await supabase.from("PlantillaCorreo").select("idioma, asunto, cuerpo");
  for (const row of data || []) {
    if (row.idioma in merged) merged[row.idioma as Idioma] = { asunto: row.asunto, cuerpo: row.cuerpo };
  }
  return NextResponse.json(merged);
}

/** Guarda las plantillas editadas. Body: { plantillas: { es:{asunto,cuerpo}, ... } } */
export async function PUT(req: NextRequest) {
  if (!authSuperAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const plantillas = body?.plantillas as Partial<Plantillas> | undefined;
  if (!plantillas) return NextResponse.json({ error: "Faltan plantillas" }, { status: 400 });

  const validos = IDIOMAS.map((i) => i.value);
  const filas = Object.entries(plantillas)
    .filter(([idioma, p]) => validos.includes(idioma as Idioma) && p?.asunto && p?.cuerpo)
    .map(([idioma, p]) => ({
      idioma,
      asunto: String(p!.asunto),
      cuerpo: String(p!.cuerpo),
      updatedAt: new Date().toISOString(),
    }));
  if (!filas.length) return NextResponse.json({ error: "Nada que guardar" }, { status: 400 });

  const { error } = await supabase.from("PlantillaCorreo").upsert(filas, { onConflict: "idioma" });
  if (error) {
    console.error("[plantillas] guardar", error);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Traduce el mensaje actual a los 3 idiomas con IA. Body: { asunto, cuerpo, idioma } */
export async function POST(req: NextRequest) {
  if (!authSuperAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Falta OPENAI_API_KEY en el servidor." }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const asunto = String(body?.asunto || "").trim();
  const cuerpo = String(body?.cuerpo || "").trim();
  if (!asunto || !cuerpo) return NextResponse.json({ error: "Asunto y mensaje requeridos" }, { status: 400 });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Eres un traductor profesional. Traduce el asunto y el cuerpo de un correo a castellano (es), catalán (ca) e inglés (en). " +
            "Mantén el tono, el significado y los saltos de línea. No añadas ni quites información. " +
            'Responde SOLO con un JSON con esta forma exacta: {"es":{"asunto":"","cuerpo":""},"ca":{"asunto":"","cuerpo":""},"en":{"asunto":"","cuerpo":""}}.',
        },
        {
          role: "user",
          content: `Idioma original: ${body?.idioma || "es"}\n\nASUNTO:\n${asunto}\n\nCUERPO:\n${cuerpo}`,
        },
      ],
    });
    const out = JSON.parse(resp.choices[0]?.message?.content || "{}");
    return NextResponse.json(out);
  } catch (e: any) {
    console.error("[plantillas] traducir", e?.message || e);
    return NextResponse.json({ error: "No se pudo traducir" }, { status: 502 });
  }
}
