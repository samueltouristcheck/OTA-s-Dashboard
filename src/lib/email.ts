import nodemailer from "nodemailer";

export { IDIOMAS, PLANTILLAS, type Idioma } from "./email-plantillas";

/** Cuenta de Gmail desde la que se envían los correos (la de Alexandra). */
const GMAIL_USER = process.env.GMAIL_USER;
/** Contraseña de aplicación de Google (16 caracteres; se permiten espacios). */
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

/** Nombre visible del remitente y, opcionalmente, dirección de respuesta. */
export const FROM_NAME = process.env.MAIL_FROM_NAME || "Alexandra";
export const REPLY_TO = process.env.MAIL_REPLY_TO || "";

export function emailConfigurado(): boolean {
  return !!(GMAIL_USER && GMAIL_APP_PASSWORD);
}

function getTransport() {
  if (!emailConfigurado()) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER as string, pass: GMAIL_APP_PASSWORD as string },
  });
}

/** Envuelve el texto plano en un HTML sencillo y legible. */
export function cuerpoToHtml(cuerpo: string): string {
  const escaped = cuerpo
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const parrafos = escaped
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;max-width:560px">${parrafos}</div>`;
}

export type EnvioResultado = { email: string; ok: boolean; error?: string };

/** Envía el mismo correo a una lista de destinatarios (uno por uno para aislar fallos). */
export async function enviarCorreos(opts: {
  destinatarios: string[];
  asunto: string;
  cuerpo: string;
}): Promise<EnvioResultado[]> {
  const transport = getTransport();
  if (!transport) throw new Error("Falta configurar GMAIL_USER y GMAIL_APP_PASSWORD en el servidor.");
  const html = cuerpoToHtml(opts.cuerpo);
  // Dirección visible del remitente. Si MAIL_FROM_ADDRESS es un alias verificado
  // en la cuenta de Gmail ("Enviar como"), saldrá desde esa dirección profesional.
  const fromAddress = process.env.MAIL_FROM_ADDRESS || GMAIL_USER;
  const from = `"${FROM_NAME}" <${fromAddress}>`;

  const resultados: EnvioResultado[] = [];
  for (const email of opts.destinatarios) {
    try {
      await transport.sendMail({
        from,
        to: email,
        subject: opts.asunto,
        text: opts.cuerpo,
        html,
        replyTo: REPLY_TO || undefined,
      });
      resultados.push({ email, ok: true });
    } catch (e: any) {
      resultados.push({ email, ok: false, error: e?.message || "error" });
    }
  }
  return resultados;
}
