"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, ArrowUpDown, X, ChevronRight, ChevronDown } from "lucide-react";
import { MultiSelect } from "@/components/MultiSelect";

type ProductoRow = {
  cliente: string;
  producto: string;
  ota: string;
  tipoEntrada: string;
  porAño: Record<number, number>;
  total: number;
};

type FiltreClient = { ota: string[]; tipo: string[] };

function nf(n: number) {
  return (n || 0).toLocaleString("es-ES");
}

export default function ProductosPage() {
  const [anys, setAnys] = useState<number[]>([]);
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [filtros, setFiltros] = useState<{ clientes: string[] }>({ clientes: [] });
  const [cargando, setCargando] = useState(true);

  const [busca, setBusca] = useState("");
  const [fCliente, setFCliente] = useState<string[]>([]);
  const [fAño, setFAño] = useState<string[]>([]);
  const [fOta, setFOta] = useState<string[]>([]);
  const [fTipo, setFTipo] = useState<string[]>([]);
  const [orden, setOrden] = useState<{ col: "cliente" | "total" | number; desc: boolean }>({ col: "cliente", desc: false });
  const [oberts, setOberts] = useState<Set<string>>(new Set());
  // Filtres propis de cada client (només s'apliquen a les seves línies).
  const [filtresClient, setFiltresClient] = useState<Record<string, FiltreClient>>({});

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : null;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token || !isAdmin) {
      setCargando(false);
      return;
    }
    fetch("/api/productos", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { anys: [], productos: [], filtros: { clientes: [] } }))
      .then((d) => {
        setAnys(Array.isArray(d.anys) ? d.anys : []);
        setProductos(Array.isArray(d.productos) ? d.productos : []);
        setFiltros({ clientes: d.filtros?.clientes || [] });
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [token, isAdmin]);

  const anysVisibles = fAño.length ? anys.filter((a) => fAño.includes(String(a))) : anys;
  const totalDe = (p: ProductoRow) => anysVisibles.reduce((s, a) => s + (p.porAño[a] || 0), 0);

  // Opcions globals d'OTA i tipus (de tots els clients) per als filtres de dalt.
  const otasGlobals = useMemo(
    () => [...new Set(productos.map((p) => p.ota).filter(Boolean))].sort(),
    [productos]
  );
  const tiposGlobals = useMemo(
    () => [...new Set(productos.map((p) => p.tipoEntrada).filter(Boolean))].sort(),
    [productos]
  );

  const detalle = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return productos.filter((p) => {
      if (fCliente.length && !fCliente.includes(p.cliente)) return false;
      if (fOta.length && !fOta.includes(p.ota)) return false;
      if (fTipo.length && !fTipo.includes(p.tipoEntrada)) return false;
      if (q && !p.cliente.toLowerCase().includes(q) && !p.producto.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [productos, busca, fCliente, fOta, fTipo]);

  const grups = useMemo(() => {
    const m = new Map<string, ProductoRow[]>();
    for (const p of detalle) {
      if (!m.has(p.cliente)) m.set(p.cliente, []);
      m.get(p.cliente)!.push(p);
    }
    const arr = [...m.entries()].map(([cliente, filas]) => {
      const porAño: Record<number, number> = {};
      for (const p of filas) for (const a of anysVisibles) porAño[a] = (porAño[a] || 0) + (p.porAño[a] || 0);
      const total = anysVisibles.reduce((s, a) => s + (porAño[a] || 0), 0);
      return {
        cliente,
        porAño,
        total,
        detall: [...filas].sort((a, b) => totalDe(b) - totalDe(a)),
        otas: [...new Set(filas.map((f) => f.ota).filter(Boolean))].sort(),
        tipos: [...new Set(filas.map((f) => f.tipoEntrada).filter(Boolean))].sort(),
      };
    });
    arr.sort((a, b) => {
      let d = 0;
      if (orden.col === "cliente") d = a.cliente.localeCompare(b.cliente);
      else if (orden.col === "total") d = a.total - b.total;
      else d = (a.porAño[orden.col] || 0) - (b.porAño[orden.col] || 0);
      return orden.desc ? -d : d;
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalle, anysVisibles, orden]);

  const totales = useMemo(() => {
    const porAño: Record<number, number> = {};
    let total = 0;
    for (const g of grups) {
      for (const a of anysVisibles) porAño[a] = (porAño[a] || 0) + (g.porAño[a] || 0);
      total += g.total;
    }
    return { porAño, total };
  }, [grups, anysVisibles]);

  function ordenar(col: "cliente" | "total" | number) {
    setOrden((o) => (o.col === col ? { col, desc: !o.desc } : { col, desc: col !== "cliente" }));
  }
  function toggle(cliente: string) {
    setOberts((prev) => {
      const n = new Set(prev);
      n.has(cliente) ? n.delete(cliente) : n.add(cliente);
      return n;
    });
  }
  function toggleFiltre(cliente: string, camp: "ota" | "tipo", valor: string) {
    setFiltresClient((prev) => {
      const actual = prev[cliente] ?? { ota: [], tipo: [] };
      const llista = actual[camp];
      const nova = llista.includes(valor) ? llista.filter((x) => x !== valor) : [...llista, valor];
      return { ...prev, [cliente]: { ...actual, [camp]: nova } };
    });
  }

  const hiHaFiltres = !!busca || fCliente.length || fAño.length || fOta.length || fTipo.length;
  function netejar() {
    setBusca("");
    setFCliente([]);
    setFAño([]);
    setFOta([]);
    setFTipo([]);
  }

  if (!isAdmin) {
    return <div className="text-slate-600">No tienes permisos para acceder a esta sección.</div>;
  }

  const nCols = anysVisibles.length + 5;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" />
          Productos
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Un cliente por fila. Haz clic para ver sus productos y filtrar por sus OTAs y tipos de entrada.
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
        <MultiSelect options={anys.map(String)} selected={fAño} onChange={setFAño} placeholder="Año" />
        <MultiSelect options={otasGlobals} selected={fOta} onChange={setFOta} placeholder="OTA" />
        <MultiSelect options={tiposGlobals} selected={fTipo} onChange={setFTipo} placeholder="Categoría" />
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
                {grups.map((g) => {
                  const obert = oberts.has(g.cliente);
                  const fc = filtresClient[g.cliente] ?? { ota: [], tipo: [] };
                  const detallFiltrat = g.detall.filter(
                    (p) => (!fc.ota.length || fc.ota.includes(p.ota)) && (!fc.tipo.length || fc.tipo.includes(p.tipoEntrada))
                  );
                  return (
                    <FragmentCliente key={g.cliente}>
                      <tr onClick={() => toggle(g.cliente)} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          <span className="inline-flex items-center gap-1.5">
                            {obert ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            {g.cliente}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400" colSpan={3}>
                          {g.detall.length} línea{g.detall.length !== 1 ? "s" : ""}
                        </td>
                        {anysVisibles.map((a) => (
                          <td key={a} className="px-4 py-2.5 text-right text-slate-700">
                            {g.porAño[a] ? nf(g.porAño[a]) : "—"}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{nf(g.total)}</td>
                      </tr>

                      {obert && (
                        <>
                          {/* Filtres propis d'aquest client */}
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <td colSpan={nCols} className="px-6 py-2.5">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <Chips label="OTA" valores={g.otas} sel={fc.ota} onToggle={(v) => toggleFiltre(g.cliente, "ota", v)} />
                                <Chips label="Tipo" valores={g.tipos} sel={fc.tipo} onToggle={(v) => toggleFiltre(g.cliente, "tipo", v)} />
                              </div>
                            </td>
                          </tr>
                          {detallFiltrat.map((p, i) => (
                            <tr key={i} className="border-b border-slate-50 bg-slate-50/40 text-slate-600">
                              <td className="px-4 py-1.5"></td>
                              <td className="px-4 py-1.5 pl-6">{p.producto}</td>
                              <td className="px-4 py-1.5">{p.ota}</td>
                              <td className="px-4 py-1.5">{p.tipoEntrada}</td>
                              {anysVisibles.map((a) => (
                                <td key={a} className="px-4 py-1.5 text-right">
                                  {p.porAño[a] ? nf(p.porAño[a]) : "—"}
                                </td>
                              ))}
                              <td className="px-4 py-1.5 text-right font-medium">{nf(totalDe(p))}</td>
                            </tr>
                          ))}
                          {detallFiltrat.length === 0 && (
                            <tr className="bg-slate-50/40">
                              <td colSpan={nCols} className="px-6 py-2 text-slate-400 text-xs">
                                Sin líneas con esos filtros.
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </FragmentCliente>
                  );
                })}
                {grups.length === 0 && (
                  <tr>
                    <td colSpan={nCols} className="px-4 py-8 text-center text-slate-500">
                      Sin resultados con estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
              {grups.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-medium text-slate-800 border-t-2 border-slate-300">
                    <td className="px-4 py-2.5" colSpan={4}>
                      Total ({grups.length} clientes)
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

function Chips({
  label,
  valores,
  sel,
  onToggle,
}: {
  label: string;
  valores: string[];
  sel: string[];
  onToggle: (v: string) => void;
}) {
  if (!valores.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-slate-500 mr-0.5">{label}:</span>
      {valores.map((v) => {
        const activo = sel.includes(v);
        return (
          <button
            key={v}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(v);
            }}
            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
              activo ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
            }`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

function FragmentCliente({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
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
