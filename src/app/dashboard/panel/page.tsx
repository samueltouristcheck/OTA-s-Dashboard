"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Plus, X } from "lucide-react";

const MESES = [
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

const MES_INICIAL = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

type Estado = { ventasEnviadas: boolean; facturaRecibida: boolean };

type ClientePanel = {
  id: string;
  nombre: string;
  codigo: string | null;
  email: string | null;
  poblacion: string | null;
  urlProducto: string | null;
  urlLooker: string | null;
  contactoVentas: string | null;
  info: string | null;
  estados: Record<string, Estado>;
};

const CAMPOS = [
  { key: "poblacion", label: "Población", ancho: "min-w-[130px]" },
  { key: "contactoVentas", label: "Contacto ventas", ancho: "min-w-[150px]" },
  { key: "email", label: "Email", ancho: "min-w-[170px]" },
  { key: "info", label: "Info", ancho: "min-w-[120px]" },
] as const;

/**
 * Poblacions de la fulla HOME de l'Excel. Són només suggeriments: es pot escriure qualsevol cosa, però
 * així no acaben conviscudes "Barcelona" i "barcelona" com va passar amb VINSEUM/Vinseum.
 */
const POBLACIONES = [
  "Barcelona",
  "Manresa",
  "Sant Cugat del Vallès",
  "Girona",
  "Vilafranca del Penedès",
  "Aguilar de Segarra",
  "Madrid",
  "Tarragona",
  "Ibiza",
];

const SIN_REGION = "(sin región)";

export default function PanelPage() {
  const [clientes, setClientes] = useState<ClientePanel[]>([]);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [cargando, setCargando] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [creando, setCreando] = useState(false);
  const [region, setRegion] = useState("");
  /** Credencials del client acabat de crear. Es mostren un cop: després la contrasenya no es torna a ensenyar aquí. */
  const [alta, setAlta] = useState<{ nombre: string; username: string; password: string; dashboardUrl: string } | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : null;
  const isAdmin = user?.role === "admin";

  const cargar = useCallback(
    async (year: number) => {
      if (!token) return;
      setCargando(true);
      try {
        const res = await fetch(`/api/panel?ano=${year}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json();
        setClientes(Array.isArray(data) ? data : []);
      } catch {
        setMessage({ type: "error", text: "No se ha podido cargar el panel" });
      } finally {
        setCargando(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (isAdmin) cargar(ano);
  }, [ano, isAdmin, cargar]);

  const anos = useMemo(() => {
    const actual = new Date().getFullYear();
    return [actual + 1, actual, actual - 1, actual - 2];
  }, []);

  /** Regions que tenen algun client, més "(sin región)" si n'hi ha algun per omplir. */
  const regiones = useMemo(() => {
    const conRegion = [...new Set(clientes.map((c) => c.poblacion?.trim()).filter(Boolean) as string[])].sort();
    const faltan = clientes.some((c) => !c.poblacion?.trim());
    return faltan ? [...conRegion, SIN_REGION] : conRegion;
  }, [clientes]);

  const visibles = useMemo(() => {
    if (!region) return clientes;
    if (region === SIN_REGION) return clientes.filter((c) => !c.poblacion?.trim());
    return clientes.filter((c) => c.poblacion?.trim() === region);
  }, [clientes, region]);

  async function guardarCampo(clienteId: string, campo: string, valor: string) {
    const limpio = valor.trim();
    // Ho apliquem també a la llista de la pantalla: si no, una regió nova no sortiria al filtre fins a
    // recarregar la pàgina.
    setClientes((prev) => prev.map((c) => (c.id === clienteId ? { ...c, [campo]: limpio || null } : c)));
    try {
      const res = await fetch("/api/panel", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clienteId, campo, valor: limpio }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error al guardar" });
      cargar(ano);
    }
  }

  async function marcar(clienteId: string, mes: string, campo: "ventasEnviadas" | "facturaRecibida", valor: boolean) {
    const cliente = clientes.find((c) => c.id === clienteId);
    const previo: Estado = cliente?.estados[mes] ?? { ventasEnviadas: false, facturaRecibida: false };
    const nuevo: Estado = { ...previo, [campo]: valor };

    // Pintem la casella de seguida i desem al darrere: si falla, la tornem enrere.
    setClientes((prev) =>
      prev.map((c) => (c.id === clienteId ? { ...c, estados: { ...c.estados, [mes]: nuevo } } : c))
    );
    try {
      const res = await fetch("/api/panel", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        // Enviem les dues caselles, no només la tocada: així no cal que el servidor llegeixi res i
        // marcar-ne dues de seguides no en perd cap.
        body: JSON.stringify({ clienteId, ano, mes, ...nuevo }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error al guardar" });
      cargar(ano);
    }
  }

  async function crearCliente() {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    setCreando(true);
    setMessage(null);
    setAlta(null);
    try {
      const res = await fetch("/api/clientes/alta", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre,
          codigo: nuevoCodigo.trim() || null,
          email: nuevoEmail.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear el cliente");

      setAlta(data);
      setNuevoNombre("");
      setNuevoCodigo("");
      setNuevoEmail("");
      setNuevoAbierto(false);
      await cargar(ano);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setCreando(false);
    }
  }

  if (!isAdmin) {
    return <div className="text-slate-600">No tienes permisos para acceder a esta sección.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Panel de clientes</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Datos de contacto y seguimiento mensual de ventas enviadas y facturas recibidas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNuevoAbierto((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            {nuevoAbierto ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {nuevoAbierto ? "Cancelar" : "Añadir cliente"}
          </button>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            title="Filtrar por región"
          >
            <option value="">Todas las regiones</option>
            {regiones.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value, 10))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {nuevoAbierto && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nombre del cliente</label>
            <input
              autoFocus
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && crearCliente()}
              placeholder="Museu Egipci"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[240px]"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Siglas (opcional)</label>
            <input
              value={nuevoCodigo}
              onChange={(e) => setNuevoCodigo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && crearCliente()}
              placeholder="EGI"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white w-28 uppercase"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Email de contacto (opcional)</label>
            <input
              value={nuevoEmail}
              onChange={(e) => setNuevoEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && crearCliente()}
              placeholder="info@museu.cat"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[200px]"
            />
          </div>
          <button
            onClick={crearCliente}
            disabled={!nuevoNombre.trim() || creando}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {creando ? "Creando..." : "Crear cliente y acceso"}
          </button>
          <p className="text-xs text-slate-500 basis-full">
            Se crea todo de una vez: el cliente, su usuario y su contraseña. Aparecerá aquí, en Datos mensuales y con su
            dashboard listo, aunque todavía no tenga ventas.
          </p>
        </div>
      )}

      {alta && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-emerald-900">{alta.nombre} ya tiene acceso</p>
              <p className="text-sm text-emerald-800 mt-0.5">
                Apunta la contraseña ahora y pásasela al cliente. Si la pierdes, la tienes también en la pantalla de
                Clientes.
              </p>
            </div>
            <button onClick={() => setAlta(null)} className="text-emerald-700 hover:text-emerald-900" title="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-6 bg-white rounded-lg border border-emerald-200 px-4 py-3">
            <div>
              <p className="text-xs text-slate-500">Usuario</p>
              <p className="font-mono text-sm text-slate-800">{alta.username}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Contraseña</p>
              <p className="font-mono text-sm text-slate-800">{alta.password}</p>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(`Usuario: ${alta.username}\nContraseña: ${alta.password}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar
            </button>
            <a
              href={alta.dashboardUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver su dashboard
            </a>
          </div>
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </div>
      )}

      {/* Suggeriments del camp Población: les poblacions de la fulla HOME, més les que ja s'hagin escrit. */}
      <datalist id="poblaciones">
        {[...new Set([...POBLACIONES, ...clientes.map((c) => c.poblacion?.trim()).filter(Boolean) as string[]])]
          .sort()
          .map((p) => (
            <option key={p} value={p} />
          ))}
      </datalist>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th rowSpan={2} className="px-3 py-2 text-left font-medium min-w-[180px] sticky left-0 bg-slate-900">
                  Cliente
                </th>
                {CAMPOS.map((c) => (
                  <th key={c.key} rowSpan={2} className={`px-3 py-2 text-left font-medium ${c.ancho}`}>
                    {c.label}
                  </th>
                ))}
                <th rowSpan={2} className="px-3 py-2 text-center font-medium min-w-[110px]">
                  Enlaces
                </th>
                <th colSpan={12} className="px-2 py-1.5 text-center font-medium border-l border-slate-700 text-xs">
                  VENTAS ENVIADAS
                </th>
                <th colSpan={12} className="px-2 py-1.5 text-center font-medium border-l border-slate-700 text-xs">
                  FACTURAS RECIBIDAS
                </th>
              </tr>
              <tr className="bg-slate-800 text-white text-xs">
                {MES_INICIAL.map((m, i) => (
                  <th key={`v-${i}`} className={`px-1 py-1 w-6 font-normal ${i === 0 ? "border-l border-slate-700" : ""}`}>
                    {m}
                  </th>
                ))}
                {MES_INICIAL.map((m, i) => (
                  <th key={`f-${i}`} className={`px-1 py-1 w-6 font-normal ${i === 0 ? "border-l border-slate-700" : ""}`}>
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={30} className="px-4 py-8 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={30} className="px-4 py-8 text-center text-slate-500">
                    {clientes.length ? `Ningún cliente en "${region}".` : "No hay clientes."}
                  </td>
                </tr>
              ) : (
                visibles.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-1.5 font-medium text-slate-800 sticky left-0 bg-white">
                      {c.nombre}
                      {c.codigo && <span className="ml-2 text-xs text-slate-400">{c.codigo}</span>}
                    </td>
                    {CAMPOS.map((campo) => (
                      <td key={campo.key} className={`px-1 py-1 border-r border-slate-100 ${campo.ancho}`}>
                        <input
                          defaultValue={(c[campo.key] as string) ?? ""}
                          list={campo.key === "poblacion" ? "poblaciones" : undefined}
                          onBlur={(e) => {
                            const nuevo = e.target.value;
                            if (nuevo !== ((c[campo.key] as string) ?? "")) guardarCampo(c.id, campo.key, nuevo);
                          }}
                          className="w-full px-2 py-1 text-sm rounded border border-transparent bg-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1 border-r border-slate-100">
                      <div className="flex items-center justify-center gap-2">
                        <Enlace url={c.urlProducto} etiqueta="Producto" onCambiar={(v) => guardarCampo(c.id, "urlProducto", v)} />
                        <Enlace url={c.urlLooker} etiqueta="Looker" onCambiar={(v) => guardarCampo(c.id, "urlLooker", v)} />
                      </div>
                    </td>
                    {MESES.map((mes, i) => (
                      <td key={`v-${mes}`} className={`px-1 py-1 text-center ${i === 0 ? "border-l border-slate-200" : ""}`}>
                        <input
                          type="checkbox"
                          checked={c.estados[mes]?.ventasEnviadas ?? false}
                          onChange={(e) => marcar(c.id, mes, "ventasEnviadas", e.target.checked)}
                          className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                          title={`Ventas enviadas · ${mes}`}
                        />
                      </td>
                    ))}
                    {MESES.map((mes, i) => (
                      <td key={`f-${mes}`} className={`px-1 py-1 text-center ${i === 0 ? "border-l border-slate-200" : ""}`}>
                        <input
                          type="checkbox"
                          checked={c.estados[mes]?.facturaRecibida ?? false}
                          onChange={(e) => marcar(c.id, mes, "facturaRecibida", e.target.checked)}
                          className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                          title={`Factura recibida · ${mes}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Los cambios se guardan solos. Los clientes sin perfil (Alsa, Fundació Miró, Castell d&apos;Hostalric y Museu
        d&apos;Art Prohibit) no salen aquí, aunque sus ventas sí se guarden.
      </p>
    </div>
  );
}

/** Enllaç del client: si no n'hi ha, deixa escriure'l; si n'hi ha, s'obre i es pot canviar. */
function Enlace({ url, etiqueta, onCambiar }: { url: string | null; etiqueta: string; onCambiar: (v: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(url ?? "");

  useEffect(() => setValor(url ?? ""), [url]);

  if (editando) {
    return (
      <input
        autoFocus
        value={valor}
        placeholder="https://..."
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => {
          setEditando(false);
          if (valor !== (url ?? "")) onCambiar(valor);
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-32 px-1 py-0.5 text-xs border border-blue-400 rounded"
      />
    );
  }

  return url ? (
    <span className="inline-flex items-center gap-0.5">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5"
      >
        {etiqueta}
        <ExternalLink className="w-3 h-3" />
      </a>
      <button onClick={() => setEditando(true)} className="text-slate-300 hover:text-slate-600 text-xs" title="Cambiar">
        ·
      </button>
    </span>
  ) : (
    <button onClick={() => setEditando(true)} className="text-xs text-slate-300 hover:text-blue-600" title={`Añadir ${etiqueta}`}>
      + {etiqueta}
    </button>
  );
}
