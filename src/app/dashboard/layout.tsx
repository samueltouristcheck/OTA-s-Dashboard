"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { LogOut } from "lucide-react";
import { getClientTheme } from "@/lib/cliente-themes";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const path = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      const theme = u?.role === "client" && u?.clienteNombre ? getClientTheme(u.clienteNombre) : null;
      const root = document.documentElement;
      if (theme) {
        root.style.setProperty("--client-primary", theme.primary);
        root.style.setProperty("--client-soft", theme.soft);
      } else {
        root.style.removeProperty("--client-primary");
        root.style.removeProperty("--client-soft");
      }
    } catch {
      document.documentElement.style.removeProperty("--client-primary");
      document.documentElement.style.removeProperty("--client-soft");
    }
  }, [mounted, path]);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem("token");
    if (!token && path !== "/login") {
      router.push("/login");
    }
  }, [mounted, path, router]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--client-soft, rgb(248 250 252))" }}>
      <Sidebar />
      <main className="ml-56 flex-1 p-6 min-h-screen">
        <div className="flex justify-end mb-4">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
