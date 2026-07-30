"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, ArrowUpDown, X } from "lucide-react";
import { MultiSelect } from "@/components/MultiSelect";

type ProductoRow = {
  cliente: string;
  producto: string;
  ota: string;
  tipoEntrada: string;
  porAño: Record<number, number>;
  total: number;
};

function nf(n: number) {
  return (n || 0).toLocaleString("es-ES");
}

export default function ProductosPage() {
  const [anys, setAnys] = useState<number[]>([]);
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [filtros, setFiltros] = useState<{ clientes: string[]; otas: string[]; tipos: string[] }>({ clientes: [], otas: [], tipos: [] });
  const [cargando, setCargando] = useState(true);

  const [busca, setBusca] = useState("");
  const [fCliente, setFCliente] = useState<string[]>([]);
  const [fOta, setFOta] = useState<string[]>([]);
  const [fTipo, setFTipo] = useState<string[]>([]);
  const [fAño, setFAño] = useState<string[]>([]);
  const [orden, setOrden] = useState<{ col: "cliente" | "total" | number; desc: boolean }>({ col: "cliente", desc: false });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : null;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token || !isAdmin) {
      setCargando(false);
      return;
    }
    fetch("/api/productos", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { anys: [], productos: [], filtros: { clientes: [], otas: [], tipos: [] } }))
      .then((d) => {
        setAnys(Array.isArray(d.anys) ? d.anys : []);
        setProductos(Array.isArray(d.productos) ? d.productos : []);
        setFiltros(d.filtros || { clientes: [], otas: [], tipos: [] });
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [token, isAdmin]);

  // Anys visibles: si es filtra per any, només aquests.
  const anysVisibles = fAño.length ? anys.filter((a) => fAño.includes(String(a))) : anys;

  const filas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let f = productos.filter((p) => {
      if (fCliente.length && !fCliente.includes(p.cliente)) return false;
      if (fOta.length && !fOta.includes(p.ota)) return false;
      if (fTipo.length && !fTipo.includes(p.tipoEntrada)) return false;
      if (q && !p.cliente.toLowerCase().includes(q) && !p.producto.toLowerCase().includes(q)) return false;
      return true;
    });

    // El "total" de cada fila respecta el filtre d'anys.
    const totalFila = (p: ProductoRow) => anysVisibles.reduce((s, a) => s + (p.porAño[a] || 0), 0);

    f = [...f].sort((a, b) => {
      let d = 0;
      if (orden.col === "cliente") d = a.cliente.localeCompare(b.cliente) || totalFila(b) - totalFila(a);
      else if (orden.col === "total") d = totalFila(a) - totalFila(b);
      else d = (a.porAño[orden.col] || 0) - (b.porAño[orden.col] || 0);
      return orden.desc ? -d : d;
    });
    return f;
  }, [productos, busca, fCliente, fOta, fTipo, anysVisibles, orden]);

  const totales = useMemo(() => {
    const porAño: Record<number, number> = {};
    let total = 0;
    for (const p of filas) {
      for (const a of anysVisibles) {
        porAño[a] = (porAño[a] || 0) + (p.porAño[a] || 0);
        total += p.porAño[a] || 0;
      }
    }
    return { porAño, total };
  }, [filas, anysVisibles]);

  function ordenar(col: "cliente" | "total" | number) {
    setOrden((o) => (o.col === col ? { col, desc: !o.desc } : { col, desc: col !== "cliente" }));
  }

  const hiHaFiltres = !!busca || fCliente.length || fOta.length || fTipo.length || fAño.length;
  function netejar() {
    setBusca("");
    setFCliente([]);
    setFOta([]);
    setFTipo([]);
    setFAño([]);
  }

  if (!isAdmin) {
    return <div className="text-slate-600">No tienes permisos para acceder a esta sección.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" />
          Productos
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Todos los productos de todos los clientes, con su histórico por año, OTA y tipo de entrada.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente o producto..."
          className="border border-slate-200 rounded-lg px-3 py-2 h-9 text-sm bg-white min-w-[200px]"
        />
        <MultiSelect options={filtros.clientes} selected={fCliente} onChange={setFCliente} placeholder="Cliente" />
        <MultiSelect options={filtros.otas} selected={fOta} onChange={setFOta} placeholder="OTA" />
        <MultiSelect options={filtros.tipos} selected={fTipo} onChange={setFTipo} placeholder="Tipo de entrada" />
        <MultiSelect options={anys.map(String)} selected={fAño} onChange={setFAño} placeholder="Año" />
        {hiHaFiltres && (
          <button onClick={netejar} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
            Limpiar
          </button>
        )}
      </div>

      {cargando ? (
        <div className="p-8 text-center text-slate-500">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <Th onClick={() => ordenar("cliente")}>Cliente</Th>
                  <th className="px-4 py-2.5 text-left font-medium">Producto</th>
                  <th className="px-4 py-2.5 text-left font-medium">OTA</th>
                  <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
                  {anysVisibles.map((a) => (
                    <Th key={a} onClick={() => ordenar(a)} right>
                      {a}
                    </Th>
                  ))}
                  <Th onClick={() => ordenar("total")} right>
                    Total
                  </Th>
                </tr>
              </thead>
              <tbody>
                {filas.map((p, i) => {
                  const totalFila = anysVisibles.reduce((s, a) => s + (p.porAño[a] || 0), 0);
                  return (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-800">{p.cliente}</td>
                      <td className="px-4 py-2 text-slate-600">{p.producto}</td>
                      <td className="px-4 py-2 text-slate-500">{p.ota}</td>
                      <td className="px-4 py-2 text-slate-500">{p.tipoEntrada}</td>
                      {anysVisibles.map((a) => (
                        <td key={a} className="px-4 py-2 text-right text-slate-700">
                          {p.porAño[a] ? nf(p.porAño[a]) : "—"}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right font-medium text-slate-800">{nf(totalFila)}</td>
                    </tr>
                  );
                })}
                {filas.length === 0 && (
                  <tr>
                    <td colSpan={anysVisibles.length + 5} className="px-4 py-8 text-center text-slate-500">
                      Sin resultados con estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
              {filas.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-medium text-slate-800 border-t-2 border-slate-300">
                    <td className="px-4 py-2.5" colSpan={4}>
                      Total ({filas.length} líneas)
                    </td>
                    {anysVisibles.map((a) => (
                      <td key={a} className="px-4 py-2.5 text-right">
                        {nf(totales.porAño[a])}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right">{nf(totales.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, onClick, right }: { children: React.ReactNode; onClick: () => void; right?: boolean }) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-2.5 font-medium cursor-pointer select-none hover:bg-slate-800 ${right ? "text-right" : "text-left"}`}
    >
      <span className={`inline-flex items-center gap-1 ${right ? "flex-row-reverse" : ""}`}>
        {children}
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      </span>
    </th>
  );
}
