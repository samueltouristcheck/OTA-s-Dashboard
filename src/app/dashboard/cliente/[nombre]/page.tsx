"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardContent } from "@/components/DashboardContent";

export default function ClientePerfilPage() {
  const params = useParams();
  const nombre = decodeURIComponent((params.nombre as string) || "");
  const [mounted, setMounted] = useState(false);

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

  return (
    <div className="space-y-6">
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
