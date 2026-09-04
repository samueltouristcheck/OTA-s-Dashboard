/**
 * Unifica els noms de Golondrinas 2026 al sistema castellà de l'historic (2023-2025):
 *   "60 MIN"->"60 Minutos", "40 MIN"->"40 Minutos"; ADULT->General, KIDS->Niño, REDUCED/INFANT->Reducido/Niño.
 * Quan una cel.la (OTA/producte/tipus/mes) queda amb dues versions, guanya el valor NO-ZERO mes recent.
 * Fa servir la clau natural i reescriu el 2026 net. --prova nomes informa.
 */
import "dotenv/config";
import { supabase } from "../src/lib/supabase";

const prodMap: Record<string,string> = { "60 MIN":"60 Minutos", "40 MIN":"40 Minutos" };
const tipoMap: Record<string,string> = { "ADULT":"General", "KIDS":"Niño", "REDUCED":"Reducido", "INFANT":"Niño" };
const CID = "cliente-golondrinas";

async function main(){
  const prova = process.argv.includes("--prova");
  const { data } = await supabase.from("Venta").select("id,ota,producto,tipoEntrada,mes,numeroEntradas,createdAt").eq("clienteId",CID).eq("ano",2026);
  const rows = data || [];
  const canon = (r:any)=>({ ota:r.ota, producto: prodMap[r.producto]||r.producto, tipo: tipoMap[r.tipoEntrada]||r.tipoEntrada, mes:r.mes });
  const g = new Map<string, any[]>();
  for(const r of rows){ const c=canon(r); const k=[c.ota,c.producto,c.tipo,c.mes].join("|"); if(!g.has(k))g.set(k,{c,arr:[]} as any); (g.get(k) as any).arr.push(r); }
  const finals:any[]=[]; const ambigu:string[]=[];
  for(const [k,obj] of g as any){ const {c,arr}=obj; const nz=arr.filter((r:any)=>r.numeroEntradas>0).sort((a:any,b:any)=>String(b.createdAt).localeCompare(String(a.createdAt))); let val=0; if(nz.length){ val=nz[0].numeroEntradas; const distinct=new Set(nz.map((r:any)=>r.numeroEntradas)); if(distinct.size>1) ambigu.push(k+"  -> quedo "+val+"  (opcions "+JSON.stringify(nz.map((r:any)=>({t:r.tipoEntrada,p:r.producto,n:r.numeroEntradas,c:String(r.createdAt).slice(0,16)})))+")"); } if(val>0) finals.push({ clienteId:CID, ota:c.ota, producto:c.producto, tipoEntrada:c.tipo, mes:c.mes, ano:2026, numeroEntradas:val }); }
  const totAbans = rows.reduce((s:number,r:any)=>s+(r.numeroEntradas||0),0);
  const totDespres = finals.reduce((s:number,r:any)=>s+r.numeroEntradas,0);
  console.log((prova?"[PROVA] ":"")+"Files 2026 abans:",rows.length," -> files finals:",finals.length);
  console.log("Entrades abans:",totAbans," -> despres:",totDespres," (diferencia:",totAbans-totDespres,"= duplicats resolts)");
  console.log("\nCel.les ambigües resoltes ("+ambigu.length+"):"); ambigu.forEach(a=>console.log("  ",a));
  if(prova){ console.log("\n[PROVA] No s'ha tocat res."); return; }
  // Aplicar: esborra tot el 2026 i reescriu net.
  const ids = rows.map((r:any)=>r.id);
  for(let i=0;i<ids.length;i+=200){ const { error }=await supabase.from("Venta").delete().in("id", ids.slice(i,i+200)); if(error) throw error; }
  for(let i=0;i<finals.length;i+=500){ const { error }=await supabase.from("Venta").upsert(finals.slice(i,i+500),{onConflict:"clienteId,ota,tipoEntrada,producto,mes,ano"}); if(error) throw error; }
  console.log("\nFet. 2026 reescrit:",finals.length,"files,",totDespres,"entrades.");
}
main().catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exit(1);});
