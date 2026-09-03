"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, Copy, Sparkles, GripVertical } from "lucide-react";
import { AsistenteOCR } from "@/components/AsistenteOCR";

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

const MES_CURT = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

type Venta = {
  ota: string;
  tipoEntrada: string;
  producto: string;
  mes: string;
  numeroEntradas: number;
};

type Cliente = { id: string; nombre: string };

type Cabecera = { ota: string; producto: string; tipoEntrada: string };

/** Una fila de la graella: una combinació d'OTA, producte i tipus, amb els 12 mesos. */
type Fila = Cabecera & {
  /**
   * Identificador estable de la fila (no canvia en editar). És la key de React: si fes servir el
   * contingut editable, en escriure una lletra canviaria la key, React recrearia la fila i l'input
   * perdria el focus a cada tecla.
   */
  uid: string;
  /** null = la cel·la no existeix a la base de dades (diferent de 0). */
  meses: (number | null)[];
  /**
   * Com estava la fila quan es va carregar, o null si és nova. Si l'usuari canvia l'OTA, el producte o
   * el tipus, la fila de la base de dades és una altra: cal esborrar la vella o el número es duplicaria.
   */
  origen: Cabecera | null;
};

const clau = (f: Cabecera) => `${f.ota}||${f.producto}||${f.tipoEntrada}`;

let uidSeq = 0;
const nouUid = () => `f${uidSeq++}`;

function filasDesdeVentas(ventas: Venta[]): Fila[] {
  const mapa = new Map<string, Fila>();
  for (const v of ventas) {
    const k = clau(v);
    if (!mapa.has(k)) {
      mapa.set(k, {
        uid: nouUid(),
        ota: v.ota,
        producto: v.producto,
        tipoEntrada: v.tipoEntrada,
        meses: Array(12).fill(null),
        origen: { ota: v.ota, producto: v.producto, tipoEntrada: v.tipoEntrada },
      });
    }
    const i = MESES.indexOf(v.mes);
    if (i >= 0) mapa.get(k)!.meses[i] = v.numeroEntradas;
  }
  return [...mapa.values()].sort(
    (a, b) => a.ota.localeCompare(b.ota) || a.producto.localeCompare(b.producto) || a.tipoEntrada.localeCompare(b.tipoEntrada)
  );
}

// L'ordre manual de les files (arrossegar per ordenar) es guarda al navegador, per client i any. És una
// preferència de visualització personal, no una dada compartida, així que localStorage és el lloc adequat.
const ordreKey = (cid: string, year: number) => `dm-orden:${cid}:${year}`;

function aplicaOrdreDesat(filas: Fila[], cid: string, year: number): Fila[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(ordreKey(cid, year)) : null;
    if (!raw) return filas;
    const orden = JSON.parse(raw) as string[];
    const pos = new Map(orden.map((k, i) => [k, i]));
    return [...filas].sort((a, b) => {
      const pa = pos.has(clau(a)) ? (pos.get(clau(a)) as number) : Infinity;
      const pb = pos.has(clau(b)) ? (pos.get(clau(b)) as number) : Infinity;
      if (pa !== pb) return pa - pb;
      return a.ota.localeCompare(b.ota) || a.producto.localeCompare(b.producto) || a.tipoEntrada.localeCompare(b.tipoEntrada);
    });
  } catch {
    return filas;
  }
}

function desaOrdre(filas: Fila[], cid: string, year: number) {
  try {
    const claus = filas
      .filter((f) => f.ota.trim() && f.producto.trim() && f.tipoEntrada.trim())
      .map((f) => clau({ ota: f.ota.trim(), producto: f.producto.trim(), tipoEntrada: f.tipoEntrada.trim() }));
    localStorage.setItem(ordreKey(cid, year), JSON.stringify(claus));
  } catch {
    /* en mode privat localStorage pot fallar; l'ordre no és crític */
  }
}

export default function DatosMensualesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [filas, setFilas] = useState<Fila[]>([]);
  const [original, setOriginal] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [asistente, setAsistente] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : null;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token || !isAdmin) return;
    fetch("/api/clientes", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((c: Cliente[]) => {
        const lista = Array.isArray(c) ? c : [];
        setClientes(lista);
        if (lista.length && !clienteId) setClienteId(lista[0].id);
      })
      .catch(() => setMessage({ type: "error", text: "No se han podido cargar los clientes" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  const cargar = useCallback(
    async (cid: string, year: number) => {
      if (!cid || !token) return;
      setCargando(true);
      try {
        const params = new URLSearchParams({ clienteId: cid, año: String(year) });
        const res = await fetch(`/api/ventas?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json();
        const nuevas = aplicaOrdreDesat(filasDesdeVentas(Array.isArray(data) ? data : []), cid, year);
        setFilas(nuevas);
        setOriginal(JSON.parse(JSON.stringify(nuevas)));
      } catch {
        setMessage({ type: "error", text: "No se han podido cargar los datos" });
      } finally {
        setCargando(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (clienteId) cargar(clienteId, ano);
  }, [clienteId, ano, cargar]);

  const anos = useMemo(() => {
    const actual = new Date().getFullYear();
    return [actual + 1, actual, actual - 1, actual - 2, actual - 3];
  }, []);

  function editarCelda(fi: number, mi: number, valor: string) {
    setFilas((prev) => {
      const copia = [...prev];
      const fila = { ...copia[fi], meses: [...copia[fi].meses] };
      // Són comptes d'entrades (enters). Traiem punts/espais/comes de miler i qualsevol caràcter no numèric,
      // perquè "1.457" o "1 457" no es desin com a 1.
      const limpio = valor.replace(/[^\d]/g, "");
      if (limpio === "") fila.meses[mi] = null;
      else {
        const n = parseInt(limpio, 10);
        if (isNaN(n) || n < 0) return prev;
        fila.meses[mi] = n;
      }
      copia[fi] = fila;
      return copia;
    });
  }

  function editarCabecera(fi: number, campo: "ota" | "producto" | "tipoEntrada", valor: string) {
    setFilas((prev) => {
      const copia = [...prev];
      copia[fi] = { ...copia[fi], [campo]: valor };
      return copia;
    });
  }

  function anadirFila() {
    setFilas((prev) => [...prev, { uid: nouUid(), ota: "", producto: "", tipoEntrada: "General", meses: Array(12).fill(null), origen: null }]);
  }

  /** Mou una fila (arrossegant) i desa el nou ordre al navegador. */
  function moure(desde: number, hasta: number) {
    if (desde === hasta) return;
    setFilas((prev) => {
      const copia = [...prev];
      const [mogut] = copia.splice(desde, 1);
      copia.splice(hasta, 0, mogut);
      desaOrdre(copia, clienteId, ano);
      return copia;
    });
    setDragIndex(null);
  }

  async function copiarEstructura() {
    if (!clienteId || !token) return;
    setCargando(true);
    try {
      const params = new URLSearchParams({ clienteId, año: String(ano - 1) });
      const res = await fetch(`/api/ventas?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      const previas = filasDesdeVentas(Array.isArray(data) ? data : []);
      if (!previas.length) {
        setMessage({ type: "error", text: `${ano - 1} no tiene filas para copiar` });
        return;
      }
      const existentes = new Set(filas.map(clau));
      const nuevas = previas
        .filter((f) => !existentes.has(clau(f)))
        .map((f) => ({ uid: nouUid(), ota: f.ota, producto: f.producto, tipoEntrada: f.tipoEntrada, meses: Array(12).fill(null), origen: null }));
      if (!nuevas.length) {
        setMessage({ type: "ok", text: "Ya están todas las filas del año anterior" });
        return;
      }
      setFilas((prev) => [...prev, ...nuevas]);
      setMessage({ type: "ok", text: `${nuevas.length} filas copiadas de ${ano - 1}. Rellena los meses y guarda.` });
    } finally {
      setCargando(false);
    }
  }

  async function borrarFila(fi: number) {
    const fila = filas[fi];
    if (!fila.origen) {
      setFilas((prev) => prev.filter((_, i) => i !== fi));
      return;
    }
    if (!confirm(`¿Borrar la fila ${fila.ota} / ${fila.producto} / ${fila.tipoEntrada} de ${ano}?`)) return;
    setGuardando(true);
    try {
      const params = new URLSearchParams({
        clienteId,
        ano: String(ano),
        ota: fila.origen.ota,
        tipoEntrada: fila.origen.tipoEntrada,
        producto: fila.origen.producto,
      });
      const res = await fetch(`/api/ventas/celdas?${params}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      setMessage({ type: "ok", text: "Fila borrada" });
      await cargar(clienteId, ano);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setGuardando(false);
    }
  }

  /** Només les cel·les que han canviat respecte del que hi havia. */
  const cambios = useMemo(() => {
    const previo = new Map(original.map((f) => [clau(f), f]));
    const out: Array<{ ota: string; tipoEntrada: string; producto: string; mes: string; numeroEntradas: number | null }> = [];

    for (const f of filas) {
      if (!f.ota.trim() || !f.producto.trim() || !f.tipoEntrada.trim()) continue;
      const actual: Cabecera = { ota: f.ota.trim(), producto: f.producto.trim(), tipoEntrada: f.tipoEntrada.trim() };
      const renombrada = f.origen && clau(f.origen) !== clau(actual);

      if (renombrada) {
        // La fila apunta a una combinació nova: esborrem la vella i reescrivim tots els mesos.
        const vieja = previo.get(clau(f.origen!));
        for (let i = 0; i < 12; i++) {
          if (vieja?.meses[i] != null) out.push({ ...f.origen!, mes: MESES[i], numeroEntradas: null });
        }
        for (let i = 0; i < 12; i++) {
          if (f.meses[i] != null) out.push({ ...actual, mes: MESES[i], numeroEntradas: f.meses[i] });
        }
        continue;
      }

      const antes = previo.get(clau(actual));
      for (let i = 0; i < 12; i++) {
        const ahora = f.meses[i];
        const before = antes?.meses[i] ?? null;
        if (ahora === before) continue;
        out.push({ ...actual, mes: MESES[i], numeroEntradas: ahora });
      }
    }
    return out;
  }, [filas, original]);

  // Files a mig omplir (sense OTA/producto/tipus). No bloquegen el guardat: simplement no es desen fins que
  // es completin. Abans bloquejaven tot el botó i semblava que no es guardés res.
  const filasIncompletas = filas.filter((f) => !f.ota.trim() || !f.producto.trim() || !f.tipoEntrada.trim()).length;

  /** Dues files amb la mateixa combinació xocarien contra la clau única. */
  const duplicadas = useMemo(() => {
    const vistas = new Set<string>();
    for (const f of filas) {
      if (!f.ota.trim() || !f.producto.trim() || !f.tipoEntrada.trim()) continue;
      const k = clau({ ota: f.ota.trim(), producto: f.producto.trim(), tipoEntrada: f.tipoEntrada.trim() });
      if (vistas.has(k)) return true;
      vistas.add(k);
    }
    return false;
  }, [filas]);

  async function guardar() {
    if (!cambios.length) return;
    setGuardando(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ventas/celdas", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clienteId, ano, cambios }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setMessage({ type: "ok", text: `Guardado: ${data.guardadas} celdas, ${data.borradas} borradas` });
      await cargar(clienteId, ano);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setGuardando(false);
    }
  }

  if (!isAdmin) {
    return <div className="text-slate-600">No tienes permisos para acceder a esta sección.</div>;
  }

  const totalMes = MESES.map((_, i) => filas.reduce((s, f) => s + (f.meses[i] ?? 0), 0));
  const totalGeneral = totalMes.reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Datos mensuales</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Una fila por OTA, producto y tipo de entrada. Los meses van en columnas, como en el Excel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAsistente(true)}
            disabled={!clienteId}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
            title="Sube una captura y la IA carga los datos (los revisas antes)"
          >
            <Sparkles className="w-4 h-4" />
            Cargar con IA
          </button>
          <button
            onClick={copiarEstructura}
            disabled={cargando || guardando || !clienteId}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            title={`Copiar las filas de ${ano - 1} sin los números`}
          >
            <Copy className="w-4 h-4" />
            Copiar filas de {ano - 1}
          </button>
          <button
            onClick={anadirFila}
            disabled={!clienteId}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Añadir fila
          </button>
          <button
            onClick={guardar}
            disabled={!cambios.length || guardando || duplicadas}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            title={duplicadas ? "Hay dos filas con la misma combinación de OTA, producto y tipo" : undefined}
          >
            <Save className="w-4 h-4" />
            {guardando ? "Guardando..." : cambios.length ? `Guardar (${cambios.length})` : "Guardar"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[220px]"
        >
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
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
        {cambios.length > 0 && (
          <span className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
            {cambios.length} cambios sin guardar
          </span>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </div>
      )}

      {duplicadas && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-800">
          Hay dos filas con la misma combinación de OTA, producto y tipo. Únelas en una sola antes de guardar (si no, una pisaría a la otra).
        </div>
      )}
      {filasIncompletas > 0 && (
        <div className="p-3 rounded-lg text-sm bg-amber-50 text-amber-800">
          Hay {filasIncompletas} fila{filasIncompletas !== 1 ? "s" : ""} sin OTA, producto o tipo (en rojo): sus números no se guardarán hasta que las completes. El resto sí se guarda.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="w-8" />
                <th className="px-3 py-2.5 text-left font-medium min-w-[130px]">OTA</th>
                <th className="px-3 py-2.5 text-left font-medium min-w-[130px]">Producto</th>
                <th className="px-3 py-2.5 text-left font-medium min-w-[110px]">Tipo</th>
                {MES_CURT.map((m) => (
                  <th key={m} className="px-2 py-2.5 text-center font-medium w-[62px]">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center font-medium w-[80px]">TOTAL</th>
                <th className="px-2 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={18} className="px-4 py-8 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : filas.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-4 py-8 text-center text-slate-500">
                    No hay datos de {ano}. Añade una fila o copia las de {ano - 1}.
                  </td>
                </tr>
              ) : (
                filas.map((f, fi) => {
                  const totalFila = f.meses.reduce((s: number, n) => s + (n ?? 0), 0);
                  return (
                    <tr
                      key={f.uid}
                      onDragOver={(e) => {
                        if (dragIndex !== null) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragIndex !== null) moure(dragIndex, fi);
                      }}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 ${
                        dragIndex === fi ? "opacity-40" : ""
                      }`}
                    >
                      <td className="px-1 py-1 text-center align-middle">
                        <span
                          draggable
                          onDragStart={() => setDragIndex(fi)}
                          onDragEnd={() => setDragIndex(null)}
                          title="Arrastra para reordenar"
                          className="inline-flex cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                      </td>
                      {(["ota", "producto", "tipoEntrada"] as const).map((campo) => (
                        <td key={campo} className="px-2 py-1 border-r border-slate-100">
                          <input
                            value={f[campo]}
                            onChange={(e) => editarCabecera(fi, campo, e.target.value)}
                            placeholder={campo === "ota" ? "Fever..." : campo === "producto" ? "General..." : "General"}
                            className={`w-full px-2 py-1 text-sm rounded border ${
                              f[campo].trim() ? "border-transparent bg-transparent" : "border-red-200 bg-red-50"
                            } focus:border-blue-400 focus:bg-white`}
                          />
                        </td>
                      ))}
                      {f.meses.map((n, mi) => (
                        <td key={mi} className="px-1 py-1 border-r border-slate-100">
                          <input
                            inputMode="numeric"
                            value={n ?? ""}
                            onChange={(e) => editarCelda(fi, mi, e.target.value)}
                            className="w-full px-1 py-1 text-sm text-right rounded border border-transparent bg-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-1 text-right font-medium text-slate-700 bg-slate-50/70">{totalFila}</td>
                      <td className="px-1 py-1 text-center">
                        <button
                          onClick={() => borrarFila(fi)}
                          disabled={guardando}
                          className="text-slate-300 hover:text-red-600 disabled:opacity-50"
                          title="Borrar fila"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filas.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-medium text-slate-800 border-t-2 border-slate-300">
                  <td className="px-3 py-2" colSpan={4}>
                    Total {ano}
                  </td>
                  {totalMes.map((n, i) => (
                    <td key={i} className="px-1 py-2 text-right">
                      {n || ""}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">{totalGeneral}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Una celda vacía no es lo mismo que un 0: vacía significa que no hay dato y no se guarda ninguna fila.
        Arrastra una fila por los puntitos de la izquierda para reordenarla; el orden se guarda en este navegador.
      </p>

      {asistente && clienteId && (
        <AsistenteOCR
          clienteId={clienteId}
          clienteNombre={clientes.find((c) => c.id === clienteId)?.nombre || ""}
          ano={ano}
          onImportado={() => cargar(clienteId, ano)}
          onClose={() => setAsistente(false)}
        />
      )}
    </div>
  );
}
