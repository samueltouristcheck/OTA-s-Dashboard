"use client";

import { useEffect, useState } from "react";
import { RefreshCw, FileSpreadsheet, Upload, Users, Image } from "lucide-react";

export default function ConfigPage() {
  const [status, setStatus] = useState<{ configured: boolean; sheetId: string | null; tabName: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncingUsers, setSyncingUsers] = useState(false);
  const [fixingPasswords, setFixingPasswords] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [savingLogo, setSavingLogo] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : null;
  const isAdmin = user?.role === "admin";
  const isSuperAdmin = ["Alexandra", "Samuel"].includes(user?.username || "");

  useEffect(() => {
    if (!token || !isAdmin) return;
    fetch("/api/sheets/status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, sheetId: null }));
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token || !user?.clienteId) return;
    fetch("/api/config/logo", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setLogoUrl(d.logoUrl || ""))
      .catch(() => {});
  }, [token, user?.clienteId]);

  async function syncSheets() {
    if (!token) return;
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sheets/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setMessage({ type: "ok", text: data.message });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error al sincronizar" });
    } finally {
      setSyncing(false);
    }
  }

  async function syncClientes() {
    if (!token) return;
    setSyncingUsers(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/sync-clientes", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setMessage({ type: "ok", text: data.message });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error al sincronizar usuarios" });
    } finally {
      setSyncingUsers(false);
    }
  }

  async function fixPasswords() {
    if (!token) return;
    setFixingPasswords(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/fix-passwords", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setMessage({ type: "ok", text: data.message });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setFixingPasswords(false);
    }
  }

  async function uploadCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setImporting(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ventas/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setMessage({ type: "ok", text: `Importadas ${data.imported} ventas` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error al importar" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function saveLogo() {
    if (!token) return;
    setSavingLogo(true);
    setMessage(null);
    try {
      const res = await fetch("/api/config/logo", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: logoUrl.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      u.clienteLogoUrl = data.logoUrl;
      localStorage.setItem("user", JSON.stringify(u));
      window.dispatchEvent(new Event("user-updated"));
      setMessage({ type: "ok", text: "Logo guardado correctamente" });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error al guardar" });
    } finally {
      setSavingLogo(false);
    }
  }

  if (!isAdmin && !user?.clienteId) {
    return (
      <div className="text-slate-600">No tienes permisos para acceder a esta sección.</div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-slate-800">Configuración</h1>
        <div className="p-6 bg-white rounded-xl border border-slate-200 space-y-4">
          <h2 className="font-medium text-slate-800 flex items-center gap-2">
            <Image className="w-5 h-5" />
            Logo de tu empresa
          </h2>
          <p className="text-sm text-slate-600">
            Pega una imagen (Ctrl+V) o pega la URL del logo. La imagen se mostrará en el panel.
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">URL o pega imagen (Ctrl+V)</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (items) {
                      for (const item of items) {
                        if (item.type.startsWith("image/")) {
                          e.preventDefault();
                          const file = item.getAsFile();
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setLogoUrl(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                          return;
                        }
                      }
                    }
                    const text = e.clipboardData?.getData("text");
                    if (text?.trim() && (text.startsWith("http") || text.startsWith("data:image"))) {
                      setLogoUrl(text.trim());
                    }
                  }}
                  placeholder="Pega aquí la imagen (Ctrl+V) o la URL del logo"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <button
                onClick={saveLogo}
                disabled={savingLogo}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {savingLogo ? "Guardando..." : "Guardar"}
              </button>
            </div>
            <div className="flex gap-3 items-center">
              <div
                tabIndex={0}
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (items) {
                    for (const item of items) {
                      if (item.type.startsWith("image/")) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setLogoUrl(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                        return;
                      }
                    }
                  }
                }}
                className="flex-1 border-2 border-dashed border-slate-200 rounded-lg p-4 text-center text-sm text-slate-500 hover:border-slate-300 hover:bg-slate-50 cursor-text focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Haz clic aquí y pega la imagen (Ctrl+V)
              </div>
              <label className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                Seleccionar archivo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setLogoUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          {logoUrl && (
            <div className="pt-2">
              <p className="text-xs text-slate-500 mb-1">Vista previa:</p>
              <img src={logoUrl} alt="Logo" className="h-16 object-contain max-w-[200px] bg-slate-50 rounded p-2" onError={() => {}} />
            </div>
          )}
        </div>
        {message && (
          <div className={`p-4 rounded-lg text-sm ${message.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
            {message.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-800">Configuración</h1>

      <div className="p-6 bg-white rounded-xl border border-slate-200 space-y-4">
        <h2 className="font-medium text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Google Sheets
        </h2>
        <p className="text-sm text-slate-600">
          Conecta tu hoja de cálculo para importar ventas automáticamente. La primera fila debe ser la cabecera con: Cliente, OTA, Tipo de Entrada, Mes respuesta, Número de entradas, Producto, Año.
        </p>
        {status && (
          <div className="text-sm">
            {status.configured ? (
              <p className="text-emerald-600 mb-2">
                ✓ Conectado a Google Sheets
                {status.tabName && (
                  <span className="text-slate-500 ml-1">(pestaña: {status.tabName})</span>
                )}
              </p>
            ) : (
              <p className="text-amber-600 mb-2">
                Configura GOOGLE_SHEETS_ID y las credenciales en .env. Ver README.
              </p>
            )}
            <button
              onClick={syncSheets}
              disabled={!status.configured || syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando..." : "Sincronizar ahora"}
            </button>
          </div>
        )}
      </div>

      {isSuperAdmin && (
        <div className="p-6 bg-white rounded-xl border border-slate-200 space-y-4">
          <h2 className="font-medium text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Sincronizar usuarios cliente
          </h2>
          <p className="text-sm text-slate-600">
            Crea o actualiza usuarios para cada cliente de Google Sheets. Usuario = nombre del cliente, contraseña = cliente123. Usa esto si el login de clientes falla.
          </p>
          <button
            onClick={syncClientes}
            disabled={syncingUsers}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncingUsers ? "animate-spin" : ""}`} />
            {syncingUsers ? "Sincronizando..." : "Sincronizar usuarios"}
          </button>
          <p className="text-xs text-slate-500 mt-2">Si el login sigue fallando:</p>
          <button
            onClick={fixPasswords}
            disabled={fixingPasswords}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${fixingPasswords ? "animate-spin" : ""}`} />
            {fixingPasswords ? "Arreglando..." : "Forzar restablecer contraseñas"}
          </button>
        </div>
      )}

      <div className="p-6 bg-white rounded-xl border border-slate-200 space-y-4">
        <h2 className="font-medium text-slate-800 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importar CSV
        </h2>
        <p className="text-sm text-slate-600">
          Sube un archivo CSV con las columnas: Cliente, OTA, Tipo de Entrada, Mes respuesta, Número de entradas, Producto, Año.
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 cursor-pointer disabled:opacity-50">
          <Upload className="w-4 h-4" />
          {importing ? "Importando..." : "Seleccionar CSV"}
          <input
            type="file"
            accept=".csv"
            onChange={uploadCSV}
            disabled={importing}
            className="hidden"
          />
        </label>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg text-sm ${
            message.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
