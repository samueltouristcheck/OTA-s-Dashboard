import { NextRequest, NextResponse } from "next/server";
import { verifyToken, type TokenPayload } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { supabase } from "@/lib/supabase";
import { enviarCorreos, emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authSuperAdmin(req: NextRequest): TokenPayload | null {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const payload = token ? verifyToken(token) : null;
  return payload && isSuperAdmin(payload) ? payload : null;
}

async function emailsDeClientes(): Promise<string[]> {
  const { data } = await supabase.from("Cliente").select("email");
  return [
    ...new Set(
      (data || [])
        .map((c: { email: string | null }) => (c.email || "").trim())
        .filter((e) => e.includes("@"))
    ),
  ];
}

/** Lista las campañas (más recientes primero). */
export async function GET(req: NextRequest) {
  if (!authSuperAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await supabase
    .from("EmailCampaign")
    .select("*")
    .order("createdAt", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[envios] list", error);
    return NextResponse.json({ error: "Error al listar envíos" }, { status: 500 });
  }
  return NextResponse.json(data || []);
}

/** Acciones: programar | prueba | enviar_ahora */
export async function POST(req: NextRequest) {
  const payload = authSuperAdmin(req);
  if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!emailConfigurado()) {
    return NextResponse.json(
      { error: "El correo no está configurado: faltan GMAIL_USER y GMAIL_APP_PASSWORD en el servidor." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const accion = body?.accion;
  const asunto = String(body?.asunto || "").trim();
  const cuerpo = String(body?.cuerpo || "").trim();
  if (!asunto || !cuerpo) return NextResponse.json({ error: "Asunto y mensaje requeridos" }, { status: 400 });

  // Destinatarios elegidos en el desplegable (emails). Vacío = todos los clientes con email.
  const elegidos: string[] = Array.isArray(body?.destinatarios)
    ? [...new Set<string>(body.destinatarios.map((e: any) => String(e).trim()).filter((e: string) => e.includes("@")))]
    : [];

  // Enviar un correo de prueba a una sola dirección, sin guardar nada.
  if (accion === "prueba") {
    const email = String(body?.email || "").trim();
    if (!email.includes("@")) return NextResponse.json({ error: "Email de prueba inválido" }, { status: 400 });
    const res = await enviarCorreos({ destinatarios: [email], asunto, cuerpo });
    const r = res[0];
    if (!r?.ok) return NextResponse.json({ error: r?.error || "No se pudo enviar" }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  // Enviar ahora a los destinatarios elegidos (o a todos si no se eligió ninguno).
  if (accion === "enviar_ahora") {
    const destinatarios = elegidos.length ? elegidos : await emailsDeClientes();
    if (!destinatarios.length) return NextResponse.json({ error: "Ningún cliente tiene email" }, { status: 400 });
    const resultados = await enviarCorreos({ destinatarios, asunto, cuerpo });
    const enviados = resultados.filter((r) => r.ok).length;
    await supabase.from("EmailCampaign").insert({
      asunto,
      cuerpo,
      idioma: body?.idioma || "es",
      fechaEnvio: new Date().toISOString().slice(0, 10),
      estado: enviados ? "enviado" : "error",
      creadoPor: payload.email,
      sentAt: new Date().toISOString(),
      resultado: { total: resultados.length, enviados, detalle: resultados },
    });
    return NextResponse.json({ ok: true, enviados, total: resultados.length, resultados });
  }

  // Programar para una fecha.
  if (accion === "programar") {
    const fechaEnvio = String(body?.fechaEnvio || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaEnvio))
      return NextResponse.json({ error: "Fecha inválida (YYYY-MM-DD)" }, { status: 400 });
    const { data, error } = await supabase
      .from("EmailCampaign")
      .insert({
        asunto,
        cuerpo,
        idioma: body?.idioma || "es",
        fechaEnvio,
        estado: "pendiente",
        creadoPor: payload.email,
        destinatarios: elegidos.length ? elegidos : null,
      })
      .select("*")
      .single();
    if (error) {
      console.error("[envios] programar", error);
      return NextResponse.json({ error: "Error al programar" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, campaign: data });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}

/** Borra una campaña pendiente. ?id=... */
export async function DELETE(req: NextRequest) {
  if (!authSuperAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  const { error } = await supabase.from("EmailCampaign").delete().eq("id", id).eq("estado", "pendiente");
  if (error) return NextResponse.json({ error: "Error al borrar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
