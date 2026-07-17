import { supabase } from "@/lib/supabase";
import type { TokenPayload } from "@/lib/auth";
import { esIdSinteticDeSheets, normalitzaClientSheet } from "@/lib/clientes-sheet";

/**
 * A quin client s'han de restringir les vendes.
 *
 * `denyAll` vol dir "cap dada", i és diferent de `clienteId: null`, que vol dir "totes" (un admin sense
 * client triat). La distinció és el que evita que un usuari client acabi veient les vendes de tots els
 * museus quan el seu client no es pot resoldre.
 */
export type ClienteFilter = { clienteId: string | null; denyAll: boolean };

/**
 * El paràmetre `clienteId` de la URL pot ser tres coses diferents segons qui el generi: un id real de la
 * taula Cliente, un nom de client (vista-cliente/[nombre]) o un id sintètic de /api/sheets/clientes.
 * Retorna l'id real, o null si no es pot resoldre.
 */
async function resolveClienteId(value: string): Promise<string | null> {
  const v = value.trim();
  if (!v) return null;
  if (esIdSinteticDeSheets(v)) return null;

  const canonico = normalitzaClientSheet(v) ?? v;
  const { data: porNombre } = await supabase
    .from("Cliente")
    .select("id")
    .ilike("nombre", canonico)
    .limit(1)
    .maybeSingle();
  if (porNombre) return porNombre.id;

  const { data: porId } = await supabase
    .from("Cliente")
    .select("id")
    .eq("id", v)
    .limit(1)
    .maybeSingle();
  return porId?.id ?? null;
}

export async function resolveClienteFilter(
  payload: TokenPayload,
  clienteIdParam: string | null
): Promise<ClienteFilter> {
  if (payload.role === "client") {
    // Un client pot tenir clienteId, només el nom, o cap dels dos (login/route.ts ho permet).
    const propi =
      (payload.clienteId ? await resolveClienteId(payload.clienteId) : null) ??
      (payload.clienteNombre ? await resolveClienteId(payload.clienteNombre) : null);
    if (!propi) return { clienteId: null, denyAll: true };
    return { clienteId: propi, denyAll: false };
  }

  if (!clienteIdParam) return { clienteId: null, denyAll: false };

  const resuelto = await resolveClienteId(clienteIdParam);
  // Client demanat però desconegut: millor no retornar res que retornar-ho tot.
  if (!resuelto) return { clienteId: null, denyAll: true };
  return { clienteId: resuelto, denyAll: false };
}
