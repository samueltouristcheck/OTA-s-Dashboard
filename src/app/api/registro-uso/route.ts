import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isSuperAdmin } from "@/lib/super-admin";

export type LoginEventRow = {
  id: string;
  userId: string;
  username: string;
  role: string;
  clienteNombre: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type ResumenUsuario = {
  userId: string;
  username: string;
  role: string;
  clienteNombre: string | null;
  conexiones: number;
  ultimaConexion: string;
  primeraConexion: string;
};

/**
 * GET: historial de conexiones (solo super admin). Query: ?days=30&limit=500
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload || !isSuperAdmin(payload)) {
      return NextResponse.json({ error: "Solo super admin puede ver el registro de uso" }, { status: 401 });
    }

    const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") || "30", 10) || 30));
    const limit = Math.min(2000, Math.max(50, parseInt(req.nextUrl.searchParams.get("limit") || "500", 10) || 500));

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    const fetchInRange = () =>
      supabase
        .from("LoginEvent")
        .select("*")
        .gte("createdAt", sinceIso)
        .order("createdAt", { ascending: false })
        .limit(limit);

    let { data, error } = await fetchInRange();

    if (error) {
      const msg = error.message || String(error);
      const missingTable =
        error.code === "42P01" ||
        /does not exist|schema cache|Could not find|relation.*not found/i.test(msg);
      if (missingTable) {
        return NextResponse.json(
          {
            error:
              "La tabla LoginEvent no existe. Ejecuta en Supabase el archivo supabase-migration-registro-uso.sql",
            events: [],
            resumen: [],
          },
          { status: 503 }
        );
      }
      console.error("[registro-uso] Supabase:", error);
      return NextResponse.json(
        {
          error: "No se pudo leer el registro de uso en Supabase.",
          details: msg,
          code: error.code,
          events: [],
          resumen: [],
        },
        { status: 502 }
      );
    }

    let events = (data || []) as LoginEventRow[];

    // Si la tabla está vacía, crear un registro de ejemplo para que la pantalla no quede en blanco
    if (events.length === 0) {
      const { count, error: countErr } = await supabase.from("LoginEvent").select("*", { count: "exact", head: true });

      if (!countErr && (count ?? 0) === 0) {
        const { error: insErr } = await supabase.from("LoginEvent").insert({
          userId: "ejemplo-sistema",
          username: "Registro de ejemplo (tabla recién creada)",
          role: "admin",
          clienteNombre: null,
          userAgent: "OTA Dashboard — fila automática",
        });
        if (insErr) {
          console.error("[registro-uso] no se pudo crear registro de ejemplo:", insErr);
        } else {
          const refetch = await fetchInRange();
          if (!refetch.error && refetch.data) {
            events = refetch.data as LoginEventRow[];
          }
        }
      }
    }

    const porUsuario = new Map<string, { rows: LoginEventRow[] }>();
    for (const ev of events) {
      const k = ev.userId;
      if (!porUsuario.has(k)) porUsuario.set(k, { rows: [] });
      porUsuario.get(k)!.rows.push(ev);
    }

    const resumen: ResumenUsuario[] = [];
    for (const [, { rows }] of porUsuario) {
      rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const first = rows[0]!;
      const last = rows[rows.length - 1]!;
      resumen.push({
        userId: first.userId,
        username: first.username,
        role: first.role,
        clienteNombre: first.clienteNombre ?? null,
        conexiones: rows.length,
        ultimaConexion: last.createdAt,
        primeraConexion: first.createdAt,
      });
    }
    resumen.sort((a, b) => new Date(b.ultimaConexion).getTime() - new Date(a.ultimaConexion).getTime());

    return NextResponse.json({ events, resumen, days, limit });
  } catch (e) {
    console.error("[registro-uso]", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Error al cargar el registro de uso", details: message }, { status: 500 });
  }
}
