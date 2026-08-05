"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Plus, X, Check } from "lucide-react";

type UserRow = {
  id: string;
  username: string;
  email?: string;
  role: string;
  clienteId?: string;
  clienteNombre?: string;
  initialPassword?: string;
};

type Cliente = { id: string; nombre: string };

/** Una fila de la taula: el client i, si en té, el seu compte d'accés. */
type Fila = {
  clienteId: string;
  nombre: string;
  userId?: string;
  username?: string;
  password?: string;
};

// Mateixa llista que src/lib/super-admin.ts: qui pot crear/editar clients i usuaris.
const SUPER_ADMINS = ["admin@2ota.com", "Alexandra", "Samuel", "alexandra@ota.com", "samuel@ota.com"];

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Alta
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [guardandoAlta, setGuardandoAlta] = useState(false);

  // Edició d'una fila
  const [editandoUserId, setEditandoUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const currentUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
  const esSuper = !!currentUser?.email && SUPER_ADMINS.includes(currentUser.email);

  function load() {
    if (!token) return Promise.resolve();
    return Promise.all([
      fetch("/api/clientes", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/users", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([c, u]) => {
        setClientes(Array.isArray(c) ? c : []);
        setUsers(Array.isArray(u) ? u : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Un client per fila, amb el seu compte d'accés si en té (per clienteId, o pel nom com a reserva).
  const filas: Fila[] = useMemo(() => {
    return clientes.map((c) => {
      const u = users.find(
        (x) =>
          (x.clienteId && x.clienteId === c.id) ||
          x.clienteNombre?.toLowerCase() === c.nombre.toLowerCase() ||
          x.username?.toLowerCase() === c.nombre.toLowerCase()
      );
      return {
        clienteId: c.id,
        nombre: c.nombre,
        userId: u?.id,
        username: u?.username,
        password: u?.initialPassword,
      };
    });
  }, [clientes, users]);

  async function crearCliente(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!nuevoNombre.trim()) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }
    setGuardandoAlta(true);
    try {
      const res = await fetch("/api/clientes/alta", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: nuevoNombre.trim(), codigo: nuevoCodigo.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear el cliente.");
        return;
      }
      setSuccess(`Cliente "${data.nombre}" creado. Usuario: ${data.username} · Contraseña: ${data.password} (cópiala ahora, no volverá a mostrarse).`);
      setNuevoNombre("");
      setNuevoCodigo("");
      setMostrarAlta(false);
      await load();
    } catch {
      setError("Error de conexión.");
    } finally {
      setGuardandoAlta(false);
    }
  }

  function empezarEdicion(f: Fila) {
    setEditandoUserId(f.userId || null);
    setEditUsername(f.username || f.nombre);
    setEditPassword("");
    setError("");
    setSuccess("");
  }

  function cancelarEdicion() {
    setEditandoUserId(null);
    setEditUsername("");
    setEditPassword("");
  }

  async function guardarEdicion(f: Fila) {
    if (!f.userId) return;
    setError("");
    setSuccess("");
    if (!editUsername.trim()) {
      setError("El usuario no puede quedar vacío.");
      return;
    }
    setGuardandoEdit(true);
    try {
      const body: Record<string, unknown> = { username: editUsername.trim() };
      if (editPassword.trim()) body.password = editPassword.trim();
      const res = await fetch(`/api/users/${f.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar.");
        return;
      }
      setSuccess(`Cambios guardados para "${f.nombre}".`);
      cancelarEdicion();
      await load();
    } catch {
      setError("Error de conexión.");
    } finally {
      setGuardandoEdit(false);
    }
  }

  // Dona accés a un client que existeix però encara no té compte.
  async function crearAcceso(f: Fila) {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: f.nombre, password: "cliente123", role: "client", clienteId: f.clienteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear el acceso.");
        return;
      }
      setSuccess(`Acceso creado para "${f.nombre}". Usuario: ${f.nombre} · Contraseña: cliente123.`);
      await load();
    } catch {
      setError("Error de conexión.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Lista de clientes</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Clientes con acceso al dashboard. Puedes añadir un cliente nuevo o editar su usuario y contraseña.
          </p>
        </div>
        {esSuper && (
          <button
            onClick={() => {
              setMostrarAlta((v) => !v);
              setError("");
              setSuccess("");
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0"
          >
            {mostrarAlta ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {mostrarAlta ? "Cerrar" : "Añadir cliente"}
          </button>
        )}
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm border border-red-100">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm border border-emerald-100">{success}</div>}

      {esSuper && mostrarAlta && (
        <form onSubmit={crearCliente} className="p-5 bg-white rounded-xl border border-slate-200 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nombre del cliente</label>
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-56"
              placeholder="Ej. Museu Marítim"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Código (opcional)</label>
            <input
              value={nuevoCodigo}
              onChange={(e) => setNuevoCodigo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-32 uppercase"
              placeholder="Ej. MM"
            />
          </div>
          <button
            type="submit"
            disabled={guardandoAlta}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {guardandoAlta ? "Creando..." : "Crear cliente y acceso"}
          </button>
          <p className="w-full text-xs text-slate-400">
            Se crea el cliente, su usuario y una contraseña automática (te la mostraremos una vez).
          </p>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">#</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Nombre del cliente</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Contraseña</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Dashboard</th>
              {esSuper && <th className="px-4 py-3 text-right font-medium text-slate-600">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const editando = editandoUserId != null && editandoUserId === f.userId;
              return (
                <tr key={f.clienteId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 align-top">{i + 1}</td>
                  <td className="px-4 py-3 font-medium align-top">{f.nombre}</td>
                  {editando ? (
                    <>
                      <td className="px-4 py-2 align-top">
                        <input
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded text-sm w-40 font-mono"
                        />
                      </td>
                      <td className="px-4 py-2 align-top" colSpan={2}>
                        <input
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded text-sm w-40 font-mono"
                          placeholder="(dejar vacío = no cambiar)"
                        />
                      </td>
                      <td className="px-4 py-2 text-right align-top">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => guardarEdicion(f)}
                            disabled={guardandoEdit}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                            title="Guardar"
                          >
                            <Check className="w-4 h-4" />
                            Guardar
                          </button>
                          <button
                            onClick={cancelarEdicion}
                            className="p-1.5 text-slate-600 hover:bg-slate-200 rounded"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono align-top">{f.username ?? <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-3 font-mono text-slate-700 align-top">
                        {f.password ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Link
                          href={`/vista-cliente/${encodeURIComponent(f.nombre)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Ver dashboard
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                      {esSuper && (
                        <td className="px-4 py-3 text-right align-top">
                          {f.userId ? (
                            <button
                              onClick={() => empezarEdicion(f)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 rounded text-sm font-medium"
                              title="Editar usuario y contraseña"
                            >
                              <Pencil className="w-4 h-4" />
                              Editar
                            </button>
                          ) : (
                            <button
                              onClick={() => crearAcceso(f)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-emerald-700 hover:bg-emerald-50 rounded text-sm font-medium"
                              title="Crear acceso para este cliente"
                            >
                              <Plus className="w-4 h-4" />
                              Crear acceso
                            </button>
                          )}
                        </td>
                      )}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filas.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No hay clientes todavía. Usa &quot;Añadir cliente&quot; para crear el primero.
          </div>
        )}
      </div>
    </div>
  );
}
