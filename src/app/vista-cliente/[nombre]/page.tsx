"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardContent } from "@/components/DashboardContent";
import { clienteSheetsEquiv } from "@/lib/clientes-sheet";
import Link from "next/link";
import { X, ArrowLeft } from "lucide-react";

export default function VistaClientePage() {
  const params = useParams();
  const router = useRouter();
  const nombre = decodeURIComponent((params.nombre as string) || "");
  const [mounted, setMounted] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : null;
  const isAdmin = user?.role === "admin";
  const clienteNombre = user?.clienteNombre;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.push("/login");
      return;
    }
    const canView = isAdmin || (!!clienteNombre && !!nombre && clienteSheetsEquiv(clienteNombre, nombre));
    if (!canView) {
      router.push("/dashboard");
    }
  }, [mounted, token, isAdmin, clienteNombre, nombre, router]);

  if (!mounted || !nombre) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  const canView = isAdmin || (!!clienteNombre && !!nombre && clienteSheetsEquiv(clienteNombre, nombre));
  if (!token || !canView) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex justify-end gap-2 p-4">
        <Link
          href="/dashboard/clientes"
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Clientes
        </Link>
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-200"
        >
          <X className="w-4 h-4" />
          Cerrar ventana
        </button>
      </div>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-xl font-semibold text-slate-800 mb-6">
          Vista de {nombre}
        </h1>
        <DashboardContent
          token={token}
          clienteId={nombre}
          isAdmin={false}
          showClienteFilter={false}
          clientMode={true}
        />
      </div>
    </div>
  );
}
