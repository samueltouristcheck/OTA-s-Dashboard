"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Send,
  Clock,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  ChevronDown,
  Users,
  Calendar,
  User,
  Globe,
} from "lucide-react";
import { IDIOMAS, PLANTILLAS, type Idioma } from "@/lib/email-plantillas";
import { MultiSelect } from "@/components/MultiSelect";

const SUPER_ADMINS = ["Alexandra", "Samuel"];

const IDIOMA_NOMBRE: Record<string, string> = { es: "Castellano", ca: "Català", en: "English" };

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Cliente = { id: string; nombre: string; email: string | null };
type EnvioDetalle = { email: string; ok: boolean; error?: string };
type Campaign = {
  id: string;
  asunto: string;
  cuerpo: string;
  idioma: string;
  fechaEnvio: string;
  estado: string;
  createdAt: string;
  sentAt: string | null;
  creadoPor: string | null;
  destinatarios: string[] | null;
  resultado: { total?: number; enviados?: number; detalle?: EnvioDetalle[] } | null;
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
  const [expandida, setExpandida] = useState<string | null>(null);

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
                label={(email) => (nombrePorEmail[email] ? `${nombrePorEmail[email]} — ${email}` : email)}
                className="min-w-[260px]"
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
          {campaigns.map((c) => {
            const abierta = expandida === c.id;
            const enviados = c.resultado?.enviados ?? 0;
            const total = c.resultado?.total ?? c.destinatarios?.length ?? 0;
            const fallidos = (c.resultado?.detalle || []).filter((d) => !d.ok);
            const numDest = c.destinatarios?.length ?? null;
            return (
              <div key={c.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                {/* Cabecera (clic para desplegar) */}
                <div
                  onClick={() => setExpandida(abierta ? null : c.id)}
                  className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">{c.asunto}</p>
                    <p className="text-xs text-slate-500">
                      {c.estado === "pendiente"
                        ? `Programado para ${c.fechaEnvio}`
                        : c.estado === "enviado"
                        ? `Enviado el ${fmtFecha(c.sentAt)} · ${enviados}/${total} entregados`
                        : "Error en el envío"}{" "}
                      · {IDIOMA_NOMBRE[c.idioma] || c.idioma.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          borrarCampaign(c.id);
                        }}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Borrar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${abierta ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>

                {/* Detalle desplegable */}
                {abierta && (
                  <div className="space-y-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-600 sm:grid-cols-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Creado: {fmtFecha(c.createdAt)}
                      </div>
                      {c.estado === "pendiente" ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" /> Programado: {c.fechaEnvio}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Send className="h-3.5 w-3.5 text-slate-400" /> Enviado: {fmtFecha(c.sentAt)}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-slate-400" /> Idioma:{" "}
                        {IDIOMA_NOMBRE[c.idioma] || c.idioma}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" /> Destinatarios:{" "}
                        {numDest != null ? numDest : "todos los clientes con email"}
                      </div>
                      {c.creadoPor && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" /> Por: {c.creadoPor}
                        </div>
                      )}
                    </div>

                    {c.estado !== "pendiente" && (
                      <div className="text-xs">
                        <span className="font-medium text-green-700">✓ {enviados} entregados</span>
                        {fallidos.length > 0 && (
                          <span className="ml-3 font-medium text-red-700">✗ {fallidos.length} con error</span>
                        )}
                        {fallidos.length > 0 && (
                          <ul className="mt-1 list-disc pl-5 text-red-600">
                            {fallidos.slice(0, 6).map((f, i) => (
                              <li key={i}>
                                {f.email}
                                {f.error ? ` — ${f.error}` : ""}
                              </li>
                            ))}
                            {fallidos.length > 6 && <li>… y {fallidos.length - 6} más</li>}
                          </ul>
                        )}
                      </div>
                    )}

                    {c.destinatarios && c.destinatarios.length > 0 && (
                      <div className="text-xs text-slate-600">
                        <p className="mb-1 font-medium">Enviado a:</p>
                        <p className="break-words text-slate-500">{c.destinatarios.join(", ")}</p>
                      </div>
                    )}

                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">Mensaje</p>
                      <p className="whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
                        {c.cuerpo}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
