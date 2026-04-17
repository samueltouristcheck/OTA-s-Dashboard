import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { ensureLoginEventTable } from "@/lib/ensure-loginevent";

/**
 * POST: crea la tabla LoginEvent en Postgres (Prisma + DATABASE_URL). Solo super admin.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const payload = token ? verifyToken(token) : null;

    if (!payload || !isSuperAdmin(payload)) {
      return NextResponse.json({ error: "Solo super admin puede ejecutar esta acción" }, { status: 401 });
    }

    const result = await ensureLoginEventTable();
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            "No se pudo crear la tabla desde aquí. Prueba: (1) ejecutar supabase-migration-registro-uso.sql en Supabase → SQL, o (2) en .env usar la URI directa de Postgres (puerto 5432, sin pooler) y volver a intentar, o (3) npm run db:loginevent en la terminal.",
          details: result.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Tabla LoginEvent creada. Pulsa Actualizar o recarga la página.",
    });
  } catch (e) {
    console.error("[ensure-loginevent]", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Error inesperado", details: message }, { status: 500 });
  }
}
