import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { enviarCorreos, emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Llamado por Vercel Cron a diario. Envía las campañas pendientes cuya fecha ya llegó. */
export async function GET(req: NextRequest) {
  // Seguridad: Vercel Cron envía "Authorization: Bearer <CRON_SECRET>" si CRON_SECRET está definido.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  if (!emailConfigurado()) {
    return NextResponse.json({ error: "Falta configuración de Gmail" }, { status: 503 });
  }

  const hoy = new Date().toISOString().slice(0, 10);

  const { data: pendientes, error } = await supabase
    .from("EmailCampaign")
    .select("*")
    .eq("estado", "pendiente")
    .lte("fechaEnvio", hoy);
  if (error) {
    console.error("[cron] list", error);
    return NextResponse.json({ error: "Error al listar pendientes" }, { status: 500 });
  }

  if (!pendientes?.length) return NextResponse.json({ ok: true, procesadas: 0 });

  // Destinatarios por defecto (todos los clientes con email) por si la campaña no fija una lista.
  const { data: clientes } = await supabase.from("Cliente").select("email");
  const todos = [
    ...new Set(
      (clientes || [])
        .map((c: { email: string | null }) => (c.email || "").trim())
        .filter((e) => e.includes("@"))
    ),
  ];

  const informe: any[] = [];
  for (const c of pendientes) {
    const destinatarios =
      Array.isArray(c.destinatarios) && c.destinatarios.length ? (c.destinatarios as string[]) : todos;
    if (!destinatarios.length) {
      await supabase
        .from("EmailCampaign")
        .update({ estado: "error", sentAt: new Date().toISOString(), resultado: { error: "Sin destinatarios" } })
        .eq("id", c.id);
      informe.push({ id: c.id, error: "Sin destinatarios" });
      continue;
    }
    const resultados = await enviarCorreos({ destinatarios, asunto: c.asunto, cuerpo: c.cuerpo });
    const enviados = resultados.filter((r) => r.ok).length;
    await supabase
      .from("EmailCampaign")
      .update({
        estado: enviados ? "enviado" : "error",
        sentAt: new Date().toISOString(),
        resultado: { total: resultados.length, enviados, detalle: resultados },
      })
      .eq("id", c.id);
    informe.push({ id: c.id, total: resultados.length, enviados });
  }

  return NextResponse.json({ ok: true, procesadas: pendientes.length, informe });
}
