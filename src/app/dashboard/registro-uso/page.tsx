"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SUPER_ADMINS } from "@/lib/super-admin";
import { registroUsoFirstCellStyle, registroUsoRowStyle } from "@/lib/registro-uso-client-color";
import { Activity, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";

type LoginEventRow = {
  id: string;
  userId: string;
  username: string;
  role: string;
  clienteNombre: string | null;
  userAgent: string | null;
  createdAt: string;
};

type ResumenUsuario = {
  userId: string;
  username: string;
  role: string;
  clienteNombre?: string | null;
  conexiones: number;
  ultimaConexion: string;
  primeraConexion: string;
};

function fmtFechaHora(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function perfilLabel(r: ResumenUsuario) {
  return (r.clienteNombre || r.username || "").trim() || r.userId;
}

function sortByUltimaDesc(a: ResumenUsuario, b: ResumenUsuario) {
  return new Date(b.ultimaConexion).getTime() - new Date(a.ultimaConexion).getTime();
}

function truncateUa(ua: string | null, max = 72) {
  if (!ua) return "—";
  const t = ua.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function normNombre(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function eventMatchesClienteNombre(e: LoginEventRow, nombreCatalogo: string): boolean {
  if (e.role !== "client") return false;
  const n = normNombre(nombreCatalogo);
  return normNombre(e.clienteNombre || "") === n || normNombre(e.username || "") === n;
}

type ClienteCatalogo = { id: string; nombre: string };

type FilaClienteLista =
  | { kind: "catalogo"; rowKey: string; clienteId: string; nombre: string; conexiones: number; ultimaConexion: string | null }
  | { kind: "huérfano"; rowKey: string; userId: string; nombre: string; conexiones: number; ultimaConexion: string };

function ListaClientesCompleta({
  title,
  filas,
  selectedKey,
  onSelectKey,
}: {
  title: string;
  filas: FilaClienteLista[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
}) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <h2 className="px-4 py-3 font-medium text-slate-800 border-b border-slate-100">{title}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Conexiones</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Última conexión</th>
              <th className="w-10 px-2 py-3" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No hay clientes dados de alta en el sistema.
                </td>
              </tr>
            ) : (
              filas.map((row) => {
                const rowBg = registroUsoRowStyle("client", row.nombre, row.nombre);
                const firstBar = registroUsoFirstCellStyle("client", row.nombre, row.nombre);
                const selected = selectedKey === row.rowKey;
                return (
                  <tr
                    key={row.rowKey}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectKey(row.rowKey)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectKey(row.rowKey);
                      }
                    }}
                    className={`cursor-pointer transition-shadow ${
                      selected ? "ring-2 ring-inset ring-blue-500 z-[1] relative" : "hover:brightness-[0.98]"
                    }`}
                  >
                    <td className="px-4 py-3 pl-3 text-left" style={{ ...rowBg, ...firstBar }}>
                      <div className="font-medium text-slate-800">{row.nombre}</div>
                      {row.kind === "huérfano" && (
                        <div className="text-xs text-amber-700/90 mt-0.5">No figura en la tabla Clientes · userId: {row.userId}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700" style={rowBg}>
                      {row.conexiones}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap" style={rowBg}>
                      {row.ultimaConexion ? (
                        fmtFechaHora(row.ultimaConexion)
                      ) : (
                        <span className="text-slate-400 italic">Sin datos</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-slate-400" style={rowBg}>
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type KpiPeriodo = {
  total: number;
  most: { userId: string; label: string; count: number } | null;
  least: { userId: string; label: string; count: number } | null;
  soloUnPerfil: boolean;
  /** Todos los perfiles con el mismo número de conexiones (>1 perfil). */
  empate: boolean;
  perfilesDistintos: number;
  rangoTexto: string;
};

/** KPIs sobre el mismo filtro de días; solo cuentas de clientes (sin administradores). */
function computeKpisPeriodo(events: LoginEventRow[], days: number): KpiPeriodo {
  const now = new Date();
  const soloClientes = events.filter((e) => e.role !== "admin");
  const byUser = new Map<string, { count: number; label: string }>();
  for (const e of soloClientes) {
    const label = (e.clienteNombre || e.username || e.userId).trim();
    const cur = byUser.get(e.userId);
    if (!cur) byUser.set(e.userId, { count: 1, label });
    else byUser.set(e.userId, { count: cur.count + 1, label: cur.label });
  }

  const entries = [...byUser.entries()].map(([userId, v]) => ({ userId, label: v.label, count: v.count }));
  const rangoBase = `Últimos ${days} días · ${now.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`;

  if (entries.length === 0) {
    return {
      total: 0,
      most: null,
      least: null,
      soloUnPerfil: false,
      empate: false,
      perfilesDistintos: 0,
      rangoTexto: rangoBase,
    };
  }

  const maxCount = Math.max(...entries.map((e) => e.count));
  const minCount = Math.min(...entries.map((e) => e.count));
  const empate = entries.length > 1 && maxCount === minCount;
  const mostCandidates = entries.filter((e) => e.count === maxCount).sort((a, b) => a.label.localeCompare(b.label, "es"));
  const leastCandidates = entries.filter((e) => e.count === minCount).sort((a, b) => a.label.localeCompare(b.label, "es"));
  const most = mostCandidates[0] ?? null;
  const least = empate ? null : leastCandidates[0] ?? null;
  const soloUnPerfil = entries.length <= 1;

  return {
    total: soloClientes.length,
    most,
    least,
    soloUnPerfil,
    empate,
    perfilesDistintos: entries.length,
    rangoTexto: rangoBase,
  };
}

function ListaAdminsBlock({
  title,
  emptyMessage,
  rows,
  selectedKey,
  onSelectKey,
}: {
  title: string;
  emptyMessage: string;
  rows: ResumenUsuario[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
}) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <h2 className="px-4 py-3 font-medium text-slate-800 border-b border-slate-100">{title}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente / usuario</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Conexiones</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Última conexión</th>
              <th className="w-10 px-2 py-3" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const rowKey = `u:${r.userId}`;
                const rowBg = registroUsoRowStyle(r.role, r.clienteNombre ?? null, r.username);
                const firstBar = registroUsoFirstCellStyle(r.role, r.clienteNombre ?? null, r.username);
                const selected = selectedKey === rowKey;
                const label = perfilLabel(r);
                const sub =
                  r.role === "client" && r.clienteNombre && r.username !== r.clienteNombre
                    ? r.username
                    : null;
                return (
                  <tr
                    key={r.userId}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectKey(rowKey)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectKey(rowKey);
                      }
                    }}
                    className={`cursor-pointer transition-shadow ${
                      selected ? "ring-2 ring-inset ring-blue-500 z-[1] relative" : "hover:brightness-[0.98]"
                    }`}
                  >
                    <td className="px-4 py-3 pl-3 text-left" style={{ ...rowBg, ...firstBar }}>
                      <div className="font-medium text-slate-800">{label}</div>
                      {sub && <div className="text-xs text-slate-500 mt-0.5">Login: {sub}</div>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700" style={rowBg}>
                      {r.conexiones}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap" style={rowBg}>
                      {fmtFechaHora(r.ultimaConexion)}
                    </td>
                    <td className="px-2 py-3 text-slate-400" style={rowBg}>
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function RegistroUsoPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ username?: string } | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<LoginEventRow[]>([]);
  const [resumen, setResumen] = useState<ResumenUsuario[]>([]);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupMsg, setSetupMsg] = useState("");
  /** `c:clienteId` = cliente del catálogo; `u:userId` = admin u cliente huérfano */
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [clientesCatalogo, setClientesCatalogo] = useState<ClienteCatalogo[]>([]);

  const isSuperAdmin = SUPER_ADMINS.includes(user?.username || "");
  const missingLoginEventTable =
    /loginevent|no existe|migraci[oó]n sql/i.test(error) ||
    /supabase-migration-registro-uso/i.test(error);

  useEffect(() => {
    setMounted(true);
    setToken(localStorage.getItem("token"));
    try {
      setUser(JSON.parse(localStorage.getItem("user") || "{}"));
    } catch {
      setUser(null);
    }
  }, []);

  const load = useCallback(() => {
    const t = localStorage.getItem("token");
    let u: { username?: string } = {};
    try {
      u = JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      u = {};
    }
    if (!t || !SUPER_ADMINS.includes(u.username || "")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`/api/registro-uso?days=${days}&limit=800`, {
        headers: { Authorization: `Bearer ${t}` },
      }).then(async (r) => ({ ok: r.ok, data: await r.json() })),
      fetch("/api/clientes", { headers: { Authorization: `Bearer ${t}` } }).then(async (r) => {
        const data = await r.json();
        return { ok: r.ok, data };
      }),
    ])
      .then(([reg, cli]) => {
        if (!reg.ok) {
          setError(reg.data?.error || reg.data?.details || "Error al cargar");
          setEvents([]);
          setResumen([]);
          setClientesCatalogo([]);
          return;
        }
        setEvents(Array.isArray(reg.data.events) ? reg.data.events : []);
        setResumen(Array.isArray(reg.data.resumen) ? reg.data.resumen : []);
        if (cli.ok && Array.isArray(cli.data)) {
          setClientesCatalogo(cli.data as ClienteCatalogo[]);
        } else {
          setClientesCatalogo([]);
        }
      })
      .catch(() => {
        setError("Error de conexión");
        setEvents([]);
        setResumen([]);
        setClientesCatalogo([]);
      })
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    if (!mounted) return;
    if (!user?.username) return;
    if (!SUPER_ADMINS.includes(user.username)) {
      router.replace("/dashboard");
    }
  }, [mounted, user?.username, router]);

  useEffect(() => {
    if (!mounted) return;
    if (!token || !isSuperAdmin) {
      setLoading(false);
      return;
    }
    load();
  }, [mounted, token, isSuperAdmin, load]);

  const filasClientes = useMemo((): FilaClienteLista[] => {
    const catalogNorms = new Set(clientesCatalogo.map((c) => normNombre(c.nombre)));
    const filas: FilaClienteLista[] = clientesCatalogo.map((c) => {
      const evs = events.filter((e) => eventMatchesClienteNombre(e, c.nombre));
      let ultima: string | null = null;
      if (evs.length > 0) {
        ultima = evs.reduce(
          (max, e) => (new Date(e.createdAt) > new Date(max) ? e.createdAt : max),
          evs[0]!.createdAt
        );
      }
      return {
        kind: "catalogo",
        rowKey: `c:${c.id}`,
        clienteId: c.id,
        nombre: c.nombre,
        conexiones: evs.length,
        ultimaConexion: ultima,
      };
    });

    const huérfanosVistos = new Set<string>();
    for (const r of resumen) {
      if (r.role !== "client") continue;
      const lab = normNombre(perfilLabel(r));
      if (!lab || catalogNorms.has(lab)) continue;
      if (huérfanosVistos.has(r.userId)) continue;
      huérfanosVistos.add(r.userId);
      filas.push({
        kind: "huérfano",
        rowKey: `u:${r.userId}`,
        userId: r.userId,
        nombre: perfilLabel(r),
        conexiones: r.conexiones,
        ultimaConexion: r.ultimaConexion,
      });
    }

    filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
    return filas;
  }, [clientesCatalogo, events, resumen]);

  const adminsLista = useMemo(
    () => resumen.filter((r) => r.role === "admin").sort(sortByUltimaDesc),
    [resumen]
  );

  const eventosSeleccionados = useMemo(() => {
    if (!selectedKey) return [];
    if (selectedKey.startsWith("c:")) {
      const id = selectedKey.slice(2);
      const c = clientesCatalogo.find((x) => x.id === id);
      if (!c) return [];
      return events
        .filter((e) => eventMatchesClienteNombre(e, c.nombre))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (selectedKey.startsWith("u:")) {
      const userId = selectedKey.slice(2);
      return events
        .filter((e) => e.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  }, [events, selectedKey, clientesCatalogo]);

  const kpisPeriodo = useMemo(() => computeKpisPeriodo(events, days), [events, days]);

  const detalleCabecera = useMemo(() => {
    if (!selectedKey) return null;
    if (selectedKey.startsWith("c:")) {
      const id = selectedKey.slice(2);
      const c = clientesCatalogo.find((x) => x.id === id);
      return {
        titulo: c?.nombre ?? "Cliente",
        subtitulo: `Cliente · ${eventosSeleccionados.length} en este período`,
      };
    }
    if (selectedKey.startsWith("u:")) {
      const uid = selectedKey.slice(2);
      const r = resumen.find((x) => x.userId === uid);
      return {
        titulo: r ? perfilLabel(r) : uid,
        subtitulo: `${r?.role === "admin" ? "Admin" : "Cliente"} · ${eventosSeleccionados.length} en este período`,
      };
    }
    return null;
  }, [selectedKey, clientesCatalogo, resumen, eventosSeleccionados.length]);

  useEffect(() => {
    if (!selectedKey) return;
    if (selectedKey.startsWith("c:")) {
      const id = selectedKey.slice(2);
      if (!clientesCatalogo.some((c) => c.id === id)) setSelectedKey(null);
      return;
    }
    if (selectedKey.startsWith("u:")) {
      const uid = selectedKey.slice(2);
      if (!resumen.some((r) => r.userId === uid)) setSelectedKey(null);
    }
  }, [selectedKey, clientesCatalogo, resumen]);

  async function createTableFromApp() {
    const t = localStorage.getItem("token");
    if (!t) return;
    setSetupBusy(true);
    setSetupMsg("");
    try {
      const res = await fetch("/api/setup/ensure-loginevent", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setSetupMsg(data.details ? `${data.error} (${data.details})` : data.error || "Error");
        return;
      }
      setError("");
      setSetupMsg(data.message || "Listo.");
      load();
    } catch {
      setSetupMsg("Error de conexión");
    } finally {
      setSetupBusy(false);
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-800">Registro de uso</h1>
        <p className="text-slate-600">No tienes permiso para ver esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Registro de uso</h1>
        <p className="text-slate-600 text-sm mt-1">
          <strong>Todos los clientes</strong> del sistema (con <strong>0</strong> o sin última conexión si no han entrado en el período). Los administradores solo aparecen si tienen actividad. Pulsa una fila para el detalle.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">Período:</label>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
        >
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
          <option value={180}>Últimos 6 meses</option>
          <option value={365}>Último año</option>
        </select>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="px-3 py-2 bg-slate-100 text-slate-800 rounded-lg text-sm hover:bg-slate-200 disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm space-y-3">
          <p>{error}</p>
          {missingLoginEventTable && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/80">
              <button
                type="button"
                onClick={createTableFromApp}
                disabled={setupBusy || loading}
                className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
              >
                {setupBusy ? "Creando tabla…" : "Crear tabla LoginEvent ahora (usa tu DATABASE_URL)"}
              </button>
              <span className="text-xs text-amber-800/90">
                Alternativa: pega el SQL de <code className="bg-amber-100 px-1 rounded">supabase-migration-registro-uso.sql</code> en Supabase → SQL Editor.
              </span>
            </div>
          )}
          {setupMsg && <p className="text-emerald-800 text-sm font-medium">{setupMsg}</p>}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-500">Cargando...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-sky-50/80 via-white to-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sky-700/90">
                <Activity className="w-4 h-4 shrink-0" />
                <p className="text-xs font-semibold uppercase tracking-wide">En el período</p>
              </div>
              <p className="text-3xl font-semibold text-slate-900 mt-3 tabular-nums leading-none">
                {kpisPeriodo.total}
              </p>
              <p className="text-sm text-slate-600 mt-1">conexiones de clientes (sin admins)</p>
              <p className="text-xs text-slate-500 mt-3 border-t border-slate-100 pt-2">{kpisPeriodo.rangoTexto}</p>
              <p className="text-[11px] text-slate-400 mt-1">Mismo rango que el filtro «Últimos {days} días»</p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-800/90">
                <TrendingUp className="w-4 h-4 shrink-0" />
                <p className="text-xs font-semibold uppercase tracking-wide">Más consultas</p>
              </div>
              {kpisPeriodo.most ? (
                <>
                  <p className="text-lg font-semibold text-slate-900 mt-3 leading-snug line-clamp-2">
                    {kpisPeriodo.most.label}
                  </p>
                  <p className="text-sm text-emerald-800/90 mt-1 font-medium tabular-nums">
                    {kpisPeriodo.most.count} {kpisPeriodo.most.count === 1 ? "conexión" : "conexiones"}
                  </p>
                </>
              ) : (
                <p className="text-slate-500 mt-3 text-sm">Sin datos en este período</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-amber-50/60 via-white to-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-amber-900/85">
                <TrendingDown className="w-4 h-4 shrink-0" />
                <p className="text-xs font-semibold uppercase tracking-wide">Menos consultas</p>
              </div>
              {kpisPeriodo.empate && kpisPeriodo.most ? (
                <>
                  <p className="text-sm text-slate-700 mt-3 leading-snug">
                    Todos los perfiles con la misma actividad ({kpisPeriodo.most.count}{" "}
                    {kpisPeriodo.most.count === 1 ? "conexión" : "conexiones"} c/u.)
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {kpisPeriodo.perfilesDistintos} perfiles distintos
                  </p>
                </>
              ) : kpisPeriodo.least && kpisPeriodo.most ? (
                <>
                  <p className="text-lg font-semibold text-slate-900 mt-3 leading-snug line-clamp-2">
                    {kpisPeriodo.least.label}
                  </p>
                  <p className="text-sm text-amber-900/80 mt-1 font-medium tabular-nums">
                    {kpisPeriodo.least.count} {kpisPeriodo.least.count === 1 ? "conexión" : "conexiones"}
                  </p>
                  {kpisPeriodo.soloUnPerfil && (
                    <p className="text-xs text-slate-500 mt-2">Único perfil con actividad en el período</p>
                  )}
                </>
              ) : (
                <p className="text-slate-500 mt-3 text-sm">Sin datos en este período</p>
              )}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div className="space-y-6">
              <ListaClientesCompleta
                title={`Clientes (${filasClientes.length})`}
                filas={filasClientes}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
              />
              <ListaAdminsBlock
                title={`Administradores (${adminsLista.length})`}
                emptyMessage="Ningún administrador con actividad en este período."
                rows={adminsLista}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
              />
            </div>

            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden lg:sticky lg:top-6 shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium text-slate-800">Conexiones del perfil</h2>
                  {detalleCabecera ? (
                    <p className="text-sm text-slate-600 mt-0.5">
                      <span className="font-medium text-slate-800">{detalleCabecera.titulo}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      {detalleCabecera.subtitulo}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 mt-0.5">
                      Elige un cliente o administrador en la lista de la izquierda.
                    </p>
                  )}
                </div>
                {selectedKey && (
                  <button
                    type="button"
                    onClick={() => setSelectedKey(null)}
                    className="shrink-0 text-sm text-slate-600 hover:text-slate-900 underline"
                  >
                    Cerrar
                  </button>
                )}
              </div>
              <div className="overflow-x-auto max-h-[min(70vh,560px)] overflow-y-auto">
                {!selectedKey ? (
                  <p className="px-4 py-12 text-center text-slate-500 text-sm">
                    Haz clic en una fila para cargar aquí todas las fechas y navegadores registrados.
                  </p>
                ) : eventosSeleccionados.length === 0 ? (
                  <p className="px-4 py-12 text-center text-slate-500 text-sm">
                    Sin conexiones registradas para este perfil en el período seleccionado.
                  </p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Fecha y hora</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Usuario</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Navegador</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventosSeleccionados.map((ev) => {
                        const rowBg = registroUsoRowStyle(ev.role, ev.clienteNombre, ev.username);
                        const firstBar = registroUsoFirstCellStyle(ev.role, ev.clienteNombre, ev.username);
                        return (
                          <tr key={ev.id} className="transition-colors">
                            <td
                              className="px-4 py-2.5 pl-3 text-slate-800 whitespace-nowrap align-top"
                              style={{ ...rowBg, ...firstBar }}
                            >
                              {fmtFechaHora(ev.createdAt)}
                            </td>
                            <td className="px-4 py-2.5 align-top text-slate-800" style={rowBg}>
                              {ev.username}
                            </td>
                            <td
                              className="px-4 py-2.5 align-top text-slate-600 text-xs max-w-[280px]"
                              style={rowBg}
                              title={ev.userAgent || undefined}
                            >
                              {truncateUa(ev.userAgent)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
