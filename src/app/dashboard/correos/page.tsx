"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send, Clock, Trash2, Loader2, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { IDIOMAS, PLANTILLAS, type Idioma } from "@/lib/email-plantillas";
import { MultiSelect } from "@/components/MultiSelect";

const SUPER_ADMINS = ["Alexandra", "Samuel"];

type Cliente = { id: string; nombre: string; email: string | null };
type Campaign = {
  id: string;
  asunto: string;
  cuerpo: string;
  idioma: string;
  fechaEnvio: string;
  estado: string;
  createdAt: string;
  sentAt: string | null;
  resultado: { total?: number; enviados?: number } | null;
};

export default function CorreosPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [emailDraft, setEmailDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [destinatarios, setDestinatarios] = useState<string[]>([]);

  const [idioma, setIdioma] = useState<Idioma>("es");
  const [asunto, setAsunto] = useState(PLANTILLAS.es.asunto);
  const [cuerpo, setCuerpo] = useState(PLANTILLAS.es.cuerpo);
  const [fecha, setFecha] = useState("");
  const [emailPrueba, setEmailPrueba] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Guard: solo super admin.
  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      const ok = SUPER_ADMINS.includes(u?.username || "");
      setAuthorized(ok);
      if (!ok) router.replace("/dashboard");
    } catch {
      setAuthorized(false);
      router.replace("/dashboard");
    }
  }, [router]);

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  function cargarClientes() {
    fetch("/api/clientes-correos", { headers })
      .then((r) => r.json())
      .then((d) => {
        const list: Cliente[] = Array.isArray(d) ? d : [];
        setClientes(list);
        setEmailDraft(Object.fromEntries(list.map((c) => [c.id, c.email || ""])));
        // Por defecto, seleccionar todos los clientes que tengan email.
        setDestinatarios(list.filter((c) => (c.email || "").includes("@")).map((c) => c.email as string));
      })
      .catch(console.error);
  }

  function cargarCampaigns() {
    fetch("/api/envios", { headers })
      .then((r) => r.json())
      .then((d) => setCampaigns(Array.isArray(d) ? d : []))
      .catch(console.error);
  }

  useEffect(() => {
    if (authorized && token) {
      cargarClientes();
      cargarCampaigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, token]);

  function cambiarIdioma(value: Idioma) {
    setIdioma(value);
    setAsunto(PLANTILLAS[value].asunto);
    setCuerpo(PLANTILLAS[value].cuerpo);
  }

  async function guardarEmail(id: string) {
    setSavingId(id);
    try {
      await fetch("/api/clientes-correos", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id, email: emailDraft[id] }),
      });
      setClientes((cs) => cs.map((c) => (c.id === id ? { ...c, email: emailDraft[id] || null } : c)));
    } finally {
      setSavingId(null);
    }
  }

  async function accion(accion: "programar" | "prueba" | "enviar_ahora") {
    setBusy(accion);
    setAviso(null);
    try {
      const body: any = { accion, asunto, cuerpo, idioma };
      if (accion === "programar") {
        body.fechaEnvio = fecha;
        body.destinatarios = destinatarios;
      }
      if (accion === "enviar_ahora") body.destinatarios = destinatarios;
      if (accion === "prueba") body.email = emailPrueba;
      const res = await fetch("/api/envios", { method: "POST", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setAviso({ tipo: "error", texto: data.error || "Error" });
        return;
      }
      if (accion === "prueba") setAviso({ tipo: "ok", texto: `Correo de prueba enviado a ${emailPrueba}` });
      if (accion === "enviar_ahora")
        setAviso({ tipo: "ok", texto: `Enviado a ${data.enviados} de ${data.total} clientes` });
      if (accion === "programar") {
        setAviso({ tipo: "ok", texto: `Programado para el ${fecha}` });
        setFecha("");
      }
      cargarCampaigns();
    } catch {
      setAviso({ tipo: "error", texto: "Error de conexión" });
    } finally {
      setBusy(null);
    }
  }

  async function borrarCampaign(id: string) {
    await fetch(`/api/envios?id=${id}`, { method: "DELETE", headers });
    cargarCampaigns();
  }

  if (authorized === null) return <div className="p-6 text-slate-500">Cargando…</div>;
  if (!authorized) return null;

  const clientesConEmail = clientes.filter((c) => (c.email || "").includes("@"));
  const opcionesEmail = clientesConEmail.map((c) => c.email as string);
  const nombrePorEmail: Record<string, string> = Object.fromEntries(
    clientesConEmail.map((c) => [c.email as string, c.nombre])
  );

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-800">
          <Mail className="h-6 w-6" /> Correos a clientes
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Programa el aviso mensual a los clientes. Rellena el email de cada uno, edita el mensaje y elige cuándo
          enviarlo.
        </p>
      </div>

      {/* Compositor tipo email */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-sm font-medium text-slate-700">Nuevo correo</span>
          <div className="flex gap-1">
            {IDIOMAS.map((i) => (
              <button
                key={i.value}
                onClick={() => cambiarIdioma(i.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  idioma === i.value
                    ? "bg-slate-800 text-white"
                    : "border border-slate-300 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm">
            <span className="w-16 text-slate-400">De</span>
            <span className="font-medium text-slate-700">Alexandra</span>
          </div>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm">
            <span className="w-16 shrink-0 text-slate-400">Para</span>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <MultiSelect
                options={opcionesEmail}
                selected={destinatarios}
                onChange={setDestinatarios}
                placeholder="Elegir destinatarios…"
                label={(email) => nombrePorEmail[email] || email}
                className="min-w-[220px]"
              />
              <span className="text-xs text-slate-500">
                {destinatarios.length} de {opcionesEmail.length} seleccionados
              </span>
              {destinatarios.length !== opcionesEmail.length && opcionesEmail.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDestinatarios(opcionesEmail)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Seleccionar todos
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm">
            <span className="w-16 text-slate-400">Asunto</span>
            <input
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <textarea
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            rows={7}
            className="w-full rounded-md border border-slate-200 p-3 text-sm leading-relaxed outline-none focus:border-slate-400"
          />

          {aviso && (
            <div
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                aviso.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
            >
              {aviso.tipo === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {aviso.texto}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Programar */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
              />
              <button
                onClick={() => accion("programar")}
                disabled={!!busy || !fecha || destinatarios.length === 0}
                className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-40"
              >
                {busy === "programar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                Programar
              </button>
            </div>

            {/* Enviar ahora */}
            <button
              onClick={() => accion("enviar_ahora")}
              disabled={!!busy || destinatarios.length === 0}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              {busy === "enviar_ahora" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar ahora
            </button>

            {/* Prueba */}
            <div className="ml-auto flex items-center gap-2">
              <input
                type="email"
                placeholder="correo de prueba"
                value={emailPrueba}
                onChange={(e) => setEmailPrueba(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
              />
              <button
                onClick={() => accion("prueba")}
                disabled={!!busy || !emailPrueba.includes("@")}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                {busy === "prueba" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar prueba"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Emails de clientes */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Emails de los clientes</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{c.nombre}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="email"
                      value={emailDraft[c.id] ?? ""}
                      onChange={(e) => setEmailDraft((d) => ({ ...d, [c.id]: e.target.value }))}
                      placeholder="correo@cliente.com"
                      className="w-full max-w-xs rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => guardarEmail(c.id)}
                      disabled={savingId === c.id || (emailDraft[c.id] ?? "") === (c.email ?? "")}
                      className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                    >
                      {savingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Guardar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clientes.length === 0 && <div className="p-6 text-center text-slate-500">No hay clientes.</div>}
        </div>
      </div>

      {/* Historial de envíos */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Envíos</h2>
        <div className="space-y-2">
          {campaigns.length === 0 && <p className="text-sm text-slate-500">Todavía no hay envíos.</p>}
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-700">{c.asunto}</p>
                <p className="text-xs text-slate-500">
                  {c.estado === "pendiente"
                    ? `Programado para ${c.fechaEnvio}`
                    : c.estado === "enviado"
                    ? `Enviado · ${c.resultado?.enviados ?? "?"}/${c.resultado?.total ?? "?"} clientes`
                    : "Error en el envío"}{" "}
                  · {c.idioma.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    c.estado === "pendiente"
                      ? "bg-amber-50 text-amber-700"
                      : c.estado === "enviado"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {c.estado}
                </span>
                {c.estado === "pendiente" && (
                  <button
                    onClick={() => borrarCampaign(c.id)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label="Borrar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
