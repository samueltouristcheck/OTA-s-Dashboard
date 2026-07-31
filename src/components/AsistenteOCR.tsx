"use client";

import { useRef, useState } from "react";
import { Sparkles, X, Upload, Trash2, Loader2 } from "lucide-react";

const MESES = [
  "01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio",
  "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre",
];

type Fila = { ota: string; producto: string; tipoEntrada: string; mes: string; numeroEntradas: number };

/**
 * Assistent: l'Alexandra puja una captura o foto d'una taula de vendes, l'IA (OCR) n'extreu les files, i
 * ABANS de desar-les les hi ensenya perquè les confirmi. No desa res fins que ella clica "Cargar".
 */
export function AsistenteOCR({
  clienteId,
  clienteNombre,
  ano,
  onImportado,
  onClose,
}: {
  clienteId: string;
  clienteNombre: string;
  ano: number;
  onImportado: () => void;
  onClose: () => void;
}) {
  const [fase, setFase] = useState<"subir" | "leyendo" | "revisar" | "guardando">("subir");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  async function leer(file: File) {
    setError(null);
    setFase("leyendo");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("ano", String(ano));
      form.append("cliente", clienteNombre);
      const res = await fetch("/api/datos/ocr", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al leer la imagen");
      if (!data.filas?.length) {
        setError("No he encontrado datos claros en la imagen. Prueba con una captura más nítida.");
        setFase("subir");
        return;
      }
      setFilas(data.filas);
      setFase("revisar");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setFase("subir");
    }
  }

  function editar(i: number, campo: keyof Fila, valor: string) {
    setFilas((prev) => {
      const c = [...prev];
      c[i] = { ...c[i], [campo]: campo === "numeroEntradas" ? parseInt(valor || "0", 10) || 0 : valor };
      return c;
    });
  }

  async function confirmar() {
    setFase("guardando");
    setError(null);
    try {
      const cambios = filas
        .filter((f) => f.ota.trim() && f.producto.trim() && f.tipoEntrada.trim() && MESES.includes(f.mes))
        .map((f) => ({ ...f, numeroEntradas: f.numeroEntradas }));
      const res = await fetch("/api/ventas/celdas", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clienteId, ano, cambios }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      onImportado();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setFase("revisar");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="font-medium text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Cargar datos con IA — {clienteNombre} · {ano}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-sm">{error}</div>}

          {fase === "subir" && (
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">
                Sube una captura o foto de una tabla de ventas. La IA leerá los datos y te los mostrará para que los
                revises <span className="font-medium">antes</span> de cargarlos.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])}
              />
              <button
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <Upload className="w-4 h-4" />
                Elegir imagen
              </button>
              <p className="text-xs text-slate-400 mt-3">Solo imágenes (captura o foto), máx. 8 MB.</p>
            </div>
          )}

          {fase === "leyendo" && (
            <div className="text-center py-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
              Leyendo la imagen...
            </div>
          )}

          {(fase === "revisar" || fase === "guardando") && (
            <>
              <p className="text-sm text-slate-700 mb-3">
                <span className="font-medium">¿Son estos los datos?</span> Revisa y corrige lo que haga falta antes de
                cargar. Se añadirán a <span className="font-medium">{clienteNombre}</span> ({ano}).
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="px-3 py-2 text-left font-medium">OTA</th>
                      <th className="px-3 py-2 text-left font-medium">Producto</th>
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="px-3 py-2 text-left font-medium">Mes</th>
                      <th className="px-3 py-2 text-right font-medium">Entradas</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-2 py-1"><Inp v={f.ota} on={(v) => editar(i, "ota", v)} /></td>
                        <td className="px-2 py-1"><Inp v={f.producto} on={(v) => editar(i, "producto", v)} /></td>
                        <td className="px-2 py-1"><Inp v={f.tipoEntrada} on={(v) => editar(i, "tipoEntrada", v)} /></td>
                        <td className="px-2 py-1">
                          <select
                            value={f.mes}
                            onChange={(e) => editar(i, "mes", e.target.value)}
                            className="w-full px-1 py-1 text-sm border border-slate-200 rounded bg-white"
                          >
                            {MESES.map((m) => (
                              <option key={m} value={m}>{m.replace(/^\d+\.\s*/, "")}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            value={f.numeroEntradas}
                            inputMode="numeric"
                            onChange={(e) => editar(i, "numeroEntradas", e.target.value)}
                            className="w-20 px-2 py-1 text-sm text-right border border-slate-200 rounded"
                          />
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => setFilas((prev) => prev.filter((_, j) => j !== i))}
                            className="text-slate-300 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {filas.length} fila{filas.length !== 1 ? "s" : ""} detectada{filas.length !== 1 ? "s" : ""}. Al cargar se
                suman/actualizan en la parrilla de ese cliente y año.
              </p>
            </>
          )}
        </div>

        {(fase === "revisar" || fase === "guardando") && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={fase === "guardando" || filas.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {fase === "guardando" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {fase === "guardando" ? "Cargando..." : `Cargar ${filas.length} fila${filas.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Inp({ v, on }: { v: string; on: (v: string) => void }) {
  return (
    <input
      value={v}
      onChange={(e) => on(e.target.value)}
      className="w-full px-2 py-1 text-sm border border-slate-200 rounded"
    />
  );
}
