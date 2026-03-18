"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Trash2, X } from "lucide-react";

const MESES = [
  "01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio",
  "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre",
];

const TIPOS = ["General", "Niño", "Reducido"];

type Venta = {
  id: string;
  clienteId: string;
  cliente?: { nombre: string };
  ota: string;
  tipoEntrada: string;
  mes: string;
  anio: number;
  numeroEntradas: number;
  producto: string;
};

export default function DatosMensualesPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newRow, setNewRow] = useState(false);
  const [filters, setFilters] = useState({
    cliente: "",
    ota: "",
    tipo: "",
    mes: "",
    ano: "",
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : null;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token || !isAdmin) return;
    Promise.all([
      fetch("/api/sheets/clientes", { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/clientes", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => []),
    ]).then(([sheetsClientes, apiClientes]) => {
      const fromSheets = Array.isArray(sheetsClientes) ? sheetsClientes : [];
      const fromApi = Array.isArray(apiClientes) ? apiClientes : [];
      const byNombre = new Map<string, { id: string; nombre: string }>();
      for (const c of fromApi) byNombre.set(c.nombre, { id: c.id, nombre: c.nombre });
      for (const c of fromSheets) {
        if (!byNombre.has(c.nombre)) byNombre.set(c.nombre, { id: c.id || c.nombre, nombre: c.nombre });
      }
      setClientes([...byNombre.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    });
  }, [token, isAdmin]);

  function loadVentas() {
    if (!token) return;
    Promise.all([
      fetch("/api/sheets/data", { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/ventas", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => []),
    ]).then(([sheetsData, ventasData]) => {
      const fromSheets = Array.isArray(sheetsData) ? sheetsData.map((v: { cliente?: { nombre: string }; clienteId?: string }) => ({
        ...v,
        clienteId: v.clienteId || v.cliente?.nombre || "",
      })) : [];
      const fromSupabase = Array.isArray(ventasData) ? ventasData : [];
      const sheetKeys = new Set(fromSheets.map((v: { cliente?: { nombre: string }; ota: string; mes: string; anio?: number; ano?: number; tipoEntrada: string; producto: string; numeroEntradas: number }) => {
        const c = v.cliente?.nombre || "";
        const a = v.anio ?? (v as { ano?: number }).ano ?? 0;
        return `${c}|${v.ota}|${v.mes}|${a}|${v.tipoEntrada}|${v.producto}|${v.numeroEntradas}`;
      }));
      const merged = [...fromSheets];
      for (const v of fromSupabase) {
        const c = v.cliente?.nombre || "";
        const a = v.anio ?? (v as { ano?: number }).ano ?? 0;
        const key = `${c}|${v.ota}|${v.mes}|${a}|${v.tipoEntrada}|${v.producto}|${v.numeroEntradas}`;
        if (!sheetKeys.has(key)) merged.push(v);
      }
      merged.sort((a, b) => {
        const aAno = a.anio ?? (a as { ano?: number }).ano ?? 0;
        const bAno = b.anio ?? (b as { ano?: number }).ano ?? 0;
        if (aAno !== bAno) return bAno - aAno;
        return (MESES.indexOf(a.mes) - MESES.indexOf(b.mes)) || 0;
      });
      setVentas(merged);
    });
  }

  useEffect(() => {
    loadVentas();
  }, [token]);

  const clienteMap = useMemo(() => new Map(clientes.map((c) => [c.id, c.nombre])), [clientes]);

  const filterOptions = useMemo(() => {
    const clientesOpt = [...new Set(ventas.map((v) => clienteMap.get(v.clienteId) || v.cliente?.nombre || "").filter(Boolean))].sort();
    const otasOpt = [...new Set(ventas.map((v) => v.ota).filter(Boolean))].sort();
    const tiposOpt = [...new Set(ventas.map((v) => v.tipoEntrada).filter(Boolean))].sort();
    const mesesOpt = [...new Set(ventas.map((v) => v.mes).filter(Boolean))].sort((a, b) => MESES.indexOf(a) - MESES.indexOf(b));
    const anosOpt = [...new Set(ventas.map((v) => v.anio ?? (v as { ano?: number }).ano).filter(Boolean))].sort((a, b) => b - a);
    return { clientes: clientesOpt, otas: otasOpt, tipos: tiposOpt, meses: mesesOpt, anos: anosOpt };
  }, [ventas, clienteMap]);

  const filteredVentas = useMemo(() => {
    return ventas.filter((v) => {
      const nombre = clienteMap.get(v.clienteId) || v.cliente?.nombre || "";
      const ano = v.anio ?? (v as { ano?: number }).ano;
      if (filters.cliente && nombre !== filters.cliente) return false;
      if (filters.ota && v.ota !== filters.ota) return false;
      if (filters.tipo && v.tipoEntrada !== filters.tipo) return false;
      if (filters.mes && v.mes !== filters.mes) return false;
      if (filters.ano && String(ano) !== filters.ano) return false;
      return true;
    });
  }, [ventas, filters, clienteMap]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  function clearFilters() {
    setFilters({ cliente: "", ota: "", tipo: "", mes: "", ano: "" });
  }

  async function saveEdit(id: string, field: string, value: string | number) {
    if (!token) return;
    const v = ventas.find((x) => x.id === id);
    if (!v) return;
    const updates: Record<string, unknown> = {};
    if (field === "clienteId" || field === "cliente") {
      const c = clientes.find((x) => x.nombre === value);
      if (c) updates.clienteId = c.id;
    } else if (field === "numeroEntradas" || field === "ano") {
      updates[field === "ano" ? "ano" : "numeroEntradas"] = typeof value === "string" ? parseInt(value, 10) || 0 : value;
    } else if (field === "tipo") {
      updates.tipoEntrada = value;
    } else {
      updates[field === "mes" ? "mes" : field] = value;
    }
    if (Object.keys(updates).length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/ventas/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Error");
      }
      setEditingCell(null);
      loadVentas();
      setMessage({ type: "ok", text: "Guardado" });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setSaving(false);
    }
  }

  const isSheetRow = (id: string) => id.startsWith("sheet-");

  function startEdit(v: Venta, field: string) {
    if (isSheetRow(v.id)) return;
    let val = "";
    if (field === "cliente") val = clienteMap.get(v.clienteId) || v.cliente?.nombre || "";
    else if (field === "ota") val = v.ota;
    else if (field === "tipo") val = v.tipoEntrada;
    else if (field === "mes") val = v.mes;
    else if (field === "ano") val = String(v.anio ?? (v as { ano?: number }).ano);
    else if (field === "numeroEntradas") val = String(v.numeroEntradas);
    else if (field === "producto") val = v.producto;
    setEditingCell({ id: v.id, field });
    setEditValue(val);
  }

  function handleCellBlur(id: string, field: string) {
    if (editingCell?.id !== id || editingCell?.field !== field) return;
    const v = ventas.find((x) => x.id === id);
    if (!v) return;
    const current = field === "cliente" ? clienteMap.get(v.clienteId) || "" : field === "numeroEntradas" || field === "ano" ? String(v[field === "ano" ? "anio" : "numeroEntradas"] ?? (v as { ano?: number }).ano ?? 0) : v[field === "tipo" ? "tipoEntrada" : field];
    if (String(editValue) !== String(current)) {
      const apiVal = field === "numeroEntradas" || field === "ano" ? parseInt(editValue, 10) : editValue;
      saveEdit(id, field, field === "numeroEntradas" || field === "ano" ? apiVal : editValue);
    } else {
      setEditingCell(null);
    }
  }

  async function handleAddRow(form: Record<string, unknown>) {
    if (!token || !form.clienteId) return;
    setSaving(true);
    setMessage(null);
    try {
      const c = clientes.find((x) => x.id === form.clienteId);
      const nombre = c?.nombre || String(form.clienteId);
      const clRes = await fetch("/api/clientes", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });
      const clData = await clRes.json();
      const clienteId = clData?.id || form.clienteId;
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId,
          ota: form.ota || "General",
          tipoEntrada: form.tipoEntrada || "General",
          mes: form.mes || MESES[new Date().getMonth()],
          ano: form.ano || new Date().getFullYear(),
          numeroEntradas: form.numeroEntradas || 0,
          producto: form.producto || "General",
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Error");
      }
      setNewRow(false);
      loadVentas();
      setMessage({ type: "ok", text: "Fila añadida" });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token || !confirm("¿Eliminar esta fila?")) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/ventas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Error");
      }
      setEditingCell(null);
      loadVentas();
      setMessage({ type: "ok", text: "Fila eliminada" });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return <div className="text-slate-600">No tienes permisos para acceder a esta sección.</div>;
  }

  const cols = [
    { key: "cliente", label: "Cliente", width: "min-w-[120px]" },
    { key: "ota", label: "OTA", width: "min-w-[100px]" },
    { key: "tipo", label: "Tipo", width: "min-w-[90px]" },
    { key: "mes", label: "Mes", width: "min-w-[100px]" },
    { key: "ano", label: "Año", width: "min-w-[60px]" },
    { key: "numeroEntradas", label: "Entradas", width: "min-w-[80px]" },
    { key: "producto", label: "Producto", width: "min-w-[100px]" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Datos mensuales</h1>
          <p className="text-slate-500 text-sm mt-0.5">Datos de Google Sheets + Supabase. Filtra, añade y edita filas.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-4 h-4" />
              Limpiar filtros
            </button>
          )}
          <button
            onClick={() => setNewRow(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Añadir fila
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                {cols.map((c) => (
                  <th key={c.key} className={`px-3 py-2.5 text-left font-medium ${c.width}`}>
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2.5 w-16 text-center">.</th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200">
                {cols.map((c, i) => (
                  <th key={c.key} className={`px-2 py-1.5 ${c.width}`}>
                    <select
                      value={filters[c.key as keyof typeof filters] || ""}
                      onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-600"
                      title="Filtrar"
                    >
                      <option value="">Todos</option>
                      {(c.key === "cliente" ? filterOptions.clientes : c.key === "ota" ? filterOptions.otas : c.key === "tipo" ? filterOptions.tipos : c.key === "mes" ? filterOptions.meses : c.key === "ano" ? filterOptions.anos : []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </th>
                ))}
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {newRow && (
                <NewRowRow
                  clientes={clientes}
                  onSave={(form) => handleAddRow(form)}
                  onCancel={() => setNewRow(false)}
                  saving={saving}
                />
              )}
              {filteredVentas.length === 0 && !newRow ? (
                <tr>
                  <td colSpan={cols.length + 1} className="px-4 py-8 text-center text-slate-500">
                    {filteredVentas.length === 0 && ventas.length > 0 && hasActiveFilters
                      ? "No hay resultados con los filtros seleccionados."
                      : "No hay datos. Añade una fila con el botón de arriba."}
                  </td>
                </tr>
              ) : (
                filteredVentas.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    {cols.map((col) => {
                      const isEditing = editingCell?.id === v.id && editingCell?.field === col.key;
                      const val = col.key === "cliente" ? clienteMap.get(v.clienteId) || v.cliente?.nombre || "" : col.key === "ano" ? (v.anio ?? (v as { ano?: number }).ano) : col.key === "mes" ? v.mes?.replace(/^\d+\.\s*/, "") : col.key === "tipo" ? v.tipoEntrada : v[col.key as keyof Venta];
                      const canEdit = !isSheetRow(v.id);
                      return (
                        <td key={col.key} className={`px-3 py-1.5 border-r border-slate-100 ${col.width} ${!canEdit ? "bg-slate-50" : ""}`}>
                          {isEditing ? (
                            col.key === "cliente" ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleCellBlur(v.id, col.key)}
                                onKeyDown={(e) => e.key === "Enter" && handleCellBlur(v.id, col.key)}
                                className="w-full px-2 py-1 border border-blue-400 rounded text-sm"
                              >
                                {clientes.map((c) => (
                                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                ))}
                              </select>
                            ) : col.key === "tipo" ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleCellBlur(v.id, col.key)}
                                onKeyDown={(e) => e.key === "Enter" && handleCellBlur(v.id, col.key)}
                                className="w-full px-2 py-1 border border-blue-400 rounded text-sm"
                              >
                                {TIPOS.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            ) : col.key === "mes" ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleCellBlur(v.id, col.key)}
                                onKeyDown={(e) => e.key === "Enter" && handleCellBlur(v.id, col.key)}
                                className="w-full px-2 py-1 border border-blue-400 rounded text-sm"
                              >
                                {MESES.map((m) => (
                                  <option key={m} value={m}>{m.replace(/^\d+\.\s*/, "")}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                autoFocus
                                type={col.key === "numeroEntradas" || col.key === "ano" ? "number" : "text"}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleCellBlur(v.id, col.key)}
                                onKeyDown={(e) => e.key === "Enter" && handleCellBlur(v.id, col.key)}
                                className="w-full px-2 py-1 border border-blue-400 rounded text-sm"
                              />
                            )
                          ) : (
                            <div
                              onClick={() => canEdit && startEdit(v, col.key)}
                              className={`min-h-[24px] py-0.5 text-slate-700 rounded px-1 -mx-1 ${canEdit ? "cursor-pointer hover:bg-slate-100" : "cursor-default"}`}
                            >
                              {val ?? "—"}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center">
                      {isSheetRow(v.id) ? (
                        <span className="text-xs text-slate-400" title="Sincroniza desde Configuración para editar datos de Sheets">Sheets</span>
                      ) : (
                        <button
                          onClick={() => handleDelete(v.id)}
                          disabled={saving}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {ventas.length > 0 && (
        <p className="text-xs text-slate-500">
          {filteredVentas.length} de {ventas.length} filas
          {hasActiveFilters && " (filtradas)"}
        </p>
      )}
    </div>
  );
}

function NewRowRow({
  clientes,
  onSave,
  onCancel,
  saving,
}: {
  clientes: { id: string; nombre: string }[];
  onSave: (form: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    clienteId: "",
    ota: "General",
    tipoEntrada: "General",
    mes: MESES[new Date().getMonth()],
    ano: new Date().getFullYear(),
    numeroEntradas: 0,
    producto: "General",
  });

  return (
    <tr className="bg-blue-50/50 border-b border-slate-200">
      <td className="px-2 py-1.5">
        <select
          value={form.clienteId}
          onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}
          className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
          required
        >
          <option value="">Cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input
          type="text"
          value={form.ota}
          onChange={(e) => setForm((f) => ({ ...f, ota: e.target.value }))}
          className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
          placeholder="OTA"
        />
      </td>
      <td className="px-2 py-1.5">
        <select
          value={form.tipoEntrada}
          onChange={(e) => setForm((f) => ({ ...f, tipoEntrada: e.target.value }))}
          className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <select
          value={form.mes}
          onChange={(e) => setForm((f) => ({ ...f, mes: e.target.value }))}
          className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
        >
          {MESES.map((m) => (
            <option key={m} value={m}>{m.replace(/^\d+\.\s*/, "")}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          value={form.ano}
          onChange={(e) => setForm((f) => ({ ...f, ano: parseInt(e.target.value) || new Date().getFullYear() }))}
          className="w-full px-2 py-1 border border-slate-200 rounded text-sm w-16"
          min={2020}
          max={2030}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          value={form.numeroEntradas || ""}
          onChange={(e) => setForm((f) => ({ ...f, numeroEntradas: parseInt(e.target.value) || 0 }))}
          className="w-full px-2 py-1 border border-slate-200 rounded text-sm w-20"
          min={0}
          placeholder="0"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="text"
          value={form.producto}
          onChange={(e) => setForm((f) => ({ ...f, producto: e.target.value }))}
          className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
          placeholder="Producto"
        />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex gap-1 justify-center">
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.clienteId}
            className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 disabled:opacity-50"
          >
            ✓
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-2 py-1 bg-slate-300 text-slate-700 rounded text-xs hover:bg-slate-400"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}
