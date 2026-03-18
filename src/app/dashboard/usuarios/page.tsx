"use client";

import { useEffect, useState } from "react";
import { Trash2, Pencil } from "lucide-react";

type User = {
  id: string;
  username: string;
  email?: string;
  role: string;
  clienteId?: string;
  clienteNombre?: string;
  initialPassword?: string;
};

type Cliente = { id: string; nombre: string };

type ClienteSheet = { id: string; nombre: string; username: string; password: string };

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesSheet, setClientesSheet] = useState<ClienteSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [role, setRole] = useState<"admin" | "client">("client");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingClienteNombre, setEditingClienteNombre] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "client">("client");
  const [editClienteId, setEditClienteId] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const currentUserId = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}")?.id : null;

  function load() {
    if (!token) return Promise.resolve();
    return Promise.all([
      fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch("/api/clientes", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch("/api/sheets/clientes", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([u, c, cs]) => {
        setUsers(Array.isArray(u) ? u : []);
        setClientes(Array.isArray(c) ? c : []);
        const list = Array.isArray(cs) ? cs : [];
        setClientesSheet(list.map((x: { id: string; nombre: string }) => ({ ...x, username: x.nombre, password: "cliente123" })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!username.trim() || !password) {
      setError("Usuario y contraseña requeridos");
      return;
    }
    if (role === "client" && !clienteId) {
      setError("Debes asignar un cliente para usuarios tipo cliente");
      return;
    }
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: username.trim(),
          password,
          clienteId: role === "client" ? clienteId : null,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear");
        return;
      }
      setSuccess("Usuario creado");
      setUsername("");
      setPassword("");
      setClienteId("");
      setRole("client");
      load();
    } catch {
      setError("Error de conexión");
    }
  }

  function startEdit(u: User) {
    setEditingId(u.id);
    setEditUsername(u.username);
    setEditPassword(u.initialPassword || "");
    setEditRole((u.role as "admin" | "client") || "client");
    setEditClienteId(u.clienteId || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingClienteNombre(null);
    setEditUsername("");
    setEditPassword("");
    setEditRole("client");
    setEditClienteId("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (editingId) {
        const body: Record<string, unknown> = { username: editUsername.trim(), role: editRole, clienteId: editClienteId || null };
        if (editPassword) body.password = editPassword;
        const res = await fetch(`/api/users/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Error al editar");
          return;
        }
        setSuccess("Usuario actualizado");
      } else if (editingClienteNombre) {
        const resCliente = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ nombre: editingClienteNombre }),
        });
        const clienteData = await resCliente.json();
        if (!resCliente.ok) {
          setError(clienteData.error || "Error al crear cliente");
          return;
        }
        const clienteIdToUse = clienteData.id;
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            username: editUsername.trim(),
            password: editPassword || "cliente123",
            role: "client",
            clienteId: clienteIdToUse,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Error al crear usuario");
          return;
        }
        setSuccess("Usuario creado");
      }
      cancelEdit();
      load();
    } catch {
      setError("Error de conexión");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este usuario?")) return;
    setDeletingId(id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al eliminar");
        setDeletingId(null);
        return;
      }
      setSuccess("Usuario eliminado");
      if (editingId === id || editingClienteNombre) cancelEdit();
      await load();
    } catch {
      setError("Error de conexión");
    } finally {
      setDeletingId(null);
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
      <h1 className="text-2xl font-semibold text-slate-800">Gestión de usuarios</h1>
      <p className="text-slate-600 text-sm">Solo el super admin (admin@2ota.com) puede crear y eliminar usuarios. Para clientes: usuario = nombre del cliente, contraseña = cliente123.</p>

      <div id="crear-usuario-form" className="p-6 bg-white rounded-xl border border-slate-200">
        <h2 className="font-medium text-slate-800 mb-4">Crear usuario</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-40"
              placeholder="nombre de usuario"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-40"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "client")} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="client">Cliente</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {role === "client" && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Cliente</label>
              <select
                value={clienteId}
                onChange={(e) => {
                  const id = e.target.value;
                  setClienteId(id);
                  const c = clientes.find((x) => x.id === id);
                  if (c) {
                    setUsername(c.nombre);
                    setPassword("cliente123");
                  }
                }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-44"
                required={role === "client"}
              >
                <option value="">Seleccionar...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Crear
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-2 text-sm text-emerald-600">{success}</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <p className="px-4 py-3 text-slate-600 text-sm">Usuario = nombre del cliente, contraseña = cliente123.</p>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">#</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Nombre del cliente</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Contraseña</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesSheet.map((c, i) => {
              const matchedUser = users.find((u) =>
                (u.clienteNombre?.toLowerCase() === c.nombre.toLowerCase()) ||
                (u.username?.toLowerCase() === c.nombre.toLowerCase())
              );
              const isEditing = (matchedUser && editingId === matchedUser.id) || editingClienteNombre === c.nombre;
              return (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  {isEditing ? (
                    <td colSpan={5} className="px-4 py-3 bg-slate-50">
                      <form onSubmit={handleEdit} className="flex flex-wrap gap-3 items-end">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Usuario</label>
                          <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="px-2 py-1.5 border rounded text-sm w-32" required />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Contraseña (vacío = no cambiar)</label>
                          <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="px-2 py-1.5 border rounded text-sm w-32" placeholder="••••••••" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Rol</label>
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value as "admin" | "client")} className="px-2 py-1.5 border rounded text-sm">
                            <option value="client">Cliente</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        {editRole === "client" && !editingClienteNombre && (
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Cliente</label>
                            <select value={editClienteId} onChange={(e) => setEditClienteId(e.target.value)} className="px-2 py-1.5 border rounded text-sm w-36">
                              <option value="">—</option>
                              {clientes.map((cl) => (
                                <option key={cl.id} value={cl.id}>{cl.nombre}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">{editingClienteNombre ? "Crear" : "Guardar"}</button>
                        <button type="button" onClick={cancelEdit} className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded text-sm">Cancelar</button>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{c.nombre}</td>
                      <td className="px-4 py-3 font-mono">{c.username}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{c.password}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => {
                              if (matchedUser) {
                                startEdit(matchedUser);
                              } else {
                                setEditingClienteNombre(c.nombre);
                                setEditUsername(c.nombre);
                                setEditPassword("cliente123");
                                setEditRole("client");
                                const sc = clientes.find((x) => x.nombre.toLowerCase() === c.nombre.toLowerCase());
                                setEditClienteId(sc?.id || "");
                              }
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {matchedUser && matchedUser.id !== currentUserId ? (
                            <button
                              type="button"
                              disabled={deletingId === matchedUser.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(matchedUser.id);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button type="button" disabled className="p-1.5 text-slate-500 cursor-not-allowed hover:bg-transparent" title="Sin usuario para eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {clientesSheet.length === 0 && (
          <div className="p-8 text-center text-slate-500">No hay clientes en Google Sheets.</div>
        )}
      </div>
    </div>
  );
}
