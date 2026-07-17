import { supabase } from "@/lib/supabase";

export type VentaRow = {
  id: string;
  clienteId: string;
  ota: string;
  tipoEntrada: string;
  mes: string;
  ano: number;
  numeroEntradas: number;
  producto: string;
};

/** Supabase talla els select a 1.000 files per defecte; cal demanar-les per pàgines. */
const PAGE_SIZE = 1000;

/**
 * Totes les vendes (opcionalment d'un client), sense el límit implícit de Supabase.
 *
 * Amb un `select("*")` pelat la taula de 13.746 files en retornava 1.000 i els totals sortien mal
 * calculats sense cap error visible.
 */
export async function fetchVentasRows(clienteId: string | null): Promise<VentaRow[]> {
  const out: VentaRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from("Venta").select("*").order("id", { ascending: true });
    if (clienteId) query = query.eq("clienteId", clienteId);
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data || []) as VentaRow[];
    out.push(...page);
    if (page.length < PAGE_SIZE) return out;
  }
}
