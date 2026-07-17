"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { BOT_NAME } from "@/lib/bot";

type Msg = { role: "user" | "assistant"; content: string };

const SUGERENCIAS = [
  "Compara 2024 con 2023",
  "¿Qué OTA vende más?",
  "Ventas por mes este año",
  "Top productos",
];

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      const data = await res.json();
      const answer = res.ok
        ? data.answer
        : data.error || "Ha ocurrido un error. Inténtalo de nuevo.";
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "No he podido conectar con el asistente." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // No mostrar el botón si no hay sesión iniciada.
  if (!token) return null;

  const accent = "var(--client-primary, #4f46e5)";

  return (
    <>
      {/* Botón flotante con bocadillo */}
      {!open && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
          {/* Bocadillo de cómic */}
          <div className="relative max-w-[230px] animate-bounce-slow rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg">
            ¡Hola! Soy <span className="font-semibold" style={{ color: accent }}>{BOT_NAME}</span> 🤖
            <br />
            ¿En qué te puedo ayudar?
            {/* Rabito del bocadillo */}
            <div className="absolute -bottom-[7px] right-7 h-3.5 w-3.5 rotate-45 border-b border-r border-slate-200 bg-white" />
          </div>

          {/* Botón robot */}
          <button
            onClick={() => setOpen(true)}
            aria-label={`Abrir el asistente ${BOT_NAME}`}
            className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-xl transition-transform hover:scale-110"
            style={{ backgroundColor: accent }}
          >
            <Bot className="h-8 w-8" />
          </button>
        </div>
      )}

      {/* Panel de chat */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[min(560px,80vh)] w-[min(380px,92vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Cabecera */}
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ backgroundColor: accent }}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">{BOT_NAME} · Asistente de ventas</p>
                <p className="text-[11px] leading-tight opacity-80">Pregúntame sobre tus datos</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" className="opacity-80 hover:opacity-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  ¡Hola! Soy {BOT_NAME} 🤖 Puedo darte comparativas, totales y rankings de tus ventas. Prueba con:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm " +
                    (m.role === "user"
                      ? "rounded-br-sm text-white"
                      : "rounded-bl-sm border border-slate-200 bg-white text-slate-700")
                  }
                  style={m.role === "user" ? { backgroundColor: accent } : undefined}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Pensando…
                </div>
              </div>
            )}
          </div>

          {/* Entrada */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-40"
              style={{ backgroundColor: accent }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
