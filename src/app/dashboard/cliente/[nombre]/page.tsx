"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardContent } from "@/components/DashboardContent";
import { KeyRound } from "lucide-react";

export default function ClientePerfilPage() {
  const params = useParams();
  const nombre = decodeURIComponent((params.nombre as string) || "");
  const [mounted, setMounted] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : null;
  const isAdmin = user?.role === "admin";
  const clienteNombre = user?.clienteNombre;

  useEffect(() => setMounted(true), []);

  if (!mounted || !nombre) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  const canView = isAdmin || clienteNombre === nombre;
  if (!canView) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
        No tienes permiso para ver el perfil de este cliente.
      </div>
    );
  }

  const isOwnProfile = clienteNombre === nombre;

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Las contraseñas no coinciden" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMsg({ type: "error", text: data.error || "Error al cambiar contraseña" });
        return;
      }
      setPasswordMsg({ type: "ok", text: "Contraseña actualizada. El super admin verá la nueva contraseña en el panel." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowChangePassword(false);
    } catch {
      setPasswordMsg({ type: "error", text: "Error de conexión" });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {isOwnProfile && (
        <div className="p-6 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-slate-600" />
              <h2 className="font-medium text-slate-800">Cambiar contraseña</h2>
            </div>
            {!showChangePassword && (
              <button
                onClick={() => setShowChangePassword(true)}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                Cambiar
              </button>
            )}
          </div>
          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-4 max-w-md">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Contraseña actual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {passwordLoading ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordMsg(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  Cancelar
                </button>
              </div>
              {passwordMsg && (
                <p className={`text-sm ${passwordMsg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                  {passwordMsg.text}
                </p>
              )}
            </form>
          )}
        </div>
      )}
      <DashboardContent
        token={token}
        clienteId={nombre}
        isAdmin={isAdmin}
        showClienteFilter={false}
        clientMode={true}
      />
    </div>
  );
}
