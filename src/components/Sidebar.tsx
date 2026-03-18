"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Settings, Users, User, UserCog, CalendarPlus } from "lucide-react";

const SUPER_ADMINS = ["Alexandra", "Samuel"];

const nav = [
  { href: "/dashboard/config", label: "Configuración", icon: Settings },
  { href: "/dashboard", label: "Superadmin", icon: LayoutDashboard, adminOnly: true },
  { href: "/dashboard/datos-mensuales", label: "Datos mensuales", icon: CalendarPlus, adminOnly: true },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users, adminOnly: true },
  { href: "/dashboard/usuarios", label: "Usuarios", icon: UserCog, superAdminOnly: true },
];

export function Sidebar() {
  const path = usePathname();
  const [user, setUser] = useState<{ role?: string; clienteNombre?: string; clienteLogoUrl?: string } | null>(null);

  function loadUser() {
    try {
      setUser(JSON.parse(localStorage.getItem("user") || "{}"));
    } catch {
      setUser(null);
    }
  }
  useEffect(() => {
    loadUser();
    const onStorage = () => loadUser();
    window.addEventListener("storage", onStorage);
    window.addEventListener("user-updated", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("user-updated", onStorage);
    };
  }, []);

  const isAdmin = user?.role === "admin";
  const isSuperAdmin = SUPER_ADMINS.includes(user?.username || "");
  const miPerfilHref = user?.clienteNombre ? `/dashboard/cliente/${encodeURIComponent(user.clienteNombre)}` : null;

  const visibleNav = nav.filter((n) => {
    if ((n as { superAdminOnly?: boolean }).superAdminOnly) return isSuperAdmin;
    if (n.adminOnly) return isAdmin;
    return true;
  });

  const userLabel = isAdmin ? "Admin" : (user?.clienteNombre || "Usuario");

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 border-r border-slate-200 bg-white p-4 flex flex-col z-30">
      <div className="flex-1">
        {user?.clienteLogoUrl ? (
          <Link href="/dashboard" className="block mb-4 -mx-4 px-4">
            <img src={user.clienteLogoUrl} alt="Logo cliente" className="w-full h-12 object-contain object-left" />
          </Link>
        ) : (
          <div className="h-14 mb-4" />
        )}
        <div className="border-b border-slate-200 mb-4" />
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{userLabel}</p>
        <nav className="space-y-1">
        {!isAdmin && miPerfilHref && (
          <Link
            href={miPerfilHref}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors border border-slate-200 bg-white shadow-sm ${
              path.startsWith("/dashboard/cliente/") ? "bg-slate-100 text-slate-900 font-medium border-slate-300" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <User className="w-4 h-4" />
            Mi perfil
          </Link>
        )}
        {visibleNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              path === href ? "bg-slate-100 text-slate-900 font-medium" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>
      </div>
      <div className="pt-4 mt-auto border-t border-slate-200">
        <Link href="/dashboard" className="block -mx-4 px-4">
          <img src="/tourischeck.jpg" alt="OTA Sales" className="w-full h-auto object-contain" />
        </Link>
      </div>
    </aside>
  );
}
