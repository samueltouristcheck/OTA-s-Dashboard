import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import {
  CHATBOT_MODEL,
  buildSystemPrompt,
  consultarVentas,
  consultarVentasTool,
  filterOptions,
  type VentaRow,
} from "@/lib/chatbot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_TURNS = 6;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "El chatbot no está configurado: falta OPENAI_API_KEY en el servidor." },
        { status: 503 }
      );
    }

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    if (!incoming.length) return NextResponse.json({ error: "Sin mensajes" }, { status: 400 });

    // Acota los datos al rol: un cliente solo ve sus propias ventas.
    const esAdmin = payload.role === "admin";
    let filterClienteId: string | null = esAdmin ? null : payload.clienteId || null;
    if (!esAdmin && filterClienteId && !filterClienteId.startsWith("cliente-")) {
      const { data: cl } = await supabase
        .from("Cliente")
        .select("id")
        .ilike("nombre", filterClienteId)
        .limit(1)
        .maybeSingle();
      if (cl) filterClienteId = cl.id;
    }

    // Carga TODAS las filas del ámbito (Supabase pagina de 1000 en 1000 por defecto).
    const PAGE = 1000;
    const data: any[] = [];
    for (let from = 0; ; from += PAGE) {
      let query = supabase
        .from("Venta")
        .select("ano, mes, ota, tipoEntrada, producto, numeroEntradas, Cliente(nombre)")
        .range(from, from + PAGE - 1);
      if (filterClienteId) query = query.eq("clienteId", filterClienteId);
      const { data: page, error } = await query;
      if (error) throw error;
      if (!page?.length) break;
      data.push(...page);
      if (page.length < PAGE) break;
    }

    const rows: VentaRow[] = data.map((r: any) => {
      const cl = Array.isArray(r.Cliente) ? r.Cliente[0] : r.Cliente;
      return {
        ano: r.ano,
        mes: r.mes,
        ota: r.ota,
        tipoEntrada: r.tipoEntrada,
        producto: r.producto,
        numeroEntradas: r.numeroEntradas,
        clienteNombre: cl?.nombre || "",
      };
    });

    const options = filterOptions(rows);
    const system = buildSystemPrompt({
      esAdmin,
      clienteNombre: payload.clienteNombre || payload.clienteId,
      options,
    });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Historial: solo role + content de cada mensaje (texto).
    const convo: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      ...incoming
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .map((m: any) => ({ role: m.role, content: String(m.content) })),
    ];

    // Bucle de function calling (manual) acotado a MAX_TURNS.
    let answer = "";
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const resp = await client.chat.completions.create({
        model: CHATBOT_MODEL,
        max_tokens: 1500,
        messages: convo,
        tools: [consultarVentasTool],
      });

      const msg = resp.choices[0]?.message;
      if (!msg) break;
      convo.push(msg);

      const calls = msg.tool_calls || [];
      if (!calls.length) {
        answer = (msg.content || "").trim();
        break;
      }

      for (const call of calls) {
        if (call.type !== "function") continue;
        let out: unknown;
        try {
          const input = JSON.parse(call.function.arguments || "{}");
          out = consultarVentas(rows, input);
        } catch {
          out = { error: "Error al consultar los datos." };
        }
        convo.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(out) });
      }
    }

    return NextResponse.json({ answer: answer || "No he podido generar una respuesta." });
  } catch (e: any) {
    console.error("[chatbot]", e?.message || e);
    return NextResponse.json({ error: "Error en el asistente" }, { status: 500 });
  }
}
