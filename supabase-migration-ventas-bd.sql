-- Migración: la base de datos pasa a ser la fuente de las ventas (antes: Google Sheets).
-- Ejecuta esto en Supabase → SQL Editor → Run.
--
-- IMPORTANTE: el paso 1 borra las ventas actuales. Son 6 copias de las mismas filas que dejó
-- /api/sheets/sync al ejecutarse 6 veces (13.746 filas para 2.602 combinaciones reales, y un total
-- inflado de 437.299 entradas). No se pueden deduplicar de forma fiable, y se regeneran desde los
-- Excels con `npm run migrar:ventas`. Haz antes la copia con `npm run backup:ventas`.

-- 1) Vaciar las ventas corruptas. Los clientes NO se tocan: los usan los logins y los correos.
DELETE FROM "Venta";

-- 2) Clave natural única: una fila por cliente/OTA/tipo/producto/mes/año.
--    Es lo que permite que la parrilla guarde por celda (upsert) y que la migración se pueda
--    repetir sin duplicar nada. Su ausencia es la causa de las 6 copias.
CREATE UNIQUE INDEX IF NOT EXISTS "Venta_natural_key"
  ON "Venta" ("clienteId", "ota", "tipoEntrada", "producto", "mes", "ano");

CREATE INDEX IF NOT EXISTS "Venta_cliente_ano_idx" ON "Venta" ("clienteId", "ano");

-- 3) Campos del panel HOME del Excel, para que deje de hacer falta el Excel.
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "codigo" TEXT;            -- siglas: LG, MC, EGI, VIN...
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "poblacion" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "urlProducto" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "urlLooker" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "contactoVentas" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "info" TEXT;

-- 4) Casillas "ventas enviadas" / "facturas recibidas" por cliente y mes (hoja HOME).
CREATE TABLE IF NOT EXISTS "EstadoMes" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clienteId" TEXT NOT NULL REFERENCES "Cliente"("id") ON DELETE CASCADE,
  "ano" INTEGER NOT NULL,
  "mes" TEXT NOT NULL,
  "ventasEnviadas" BOOLEAN NOT NULL DEFAULT false,
  "facturaRecibida" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "EstadoMes_cliente_ano_mes_key" UNIQUE ("clienteId", "ano", "mes")
);

ALTER TABLE "EstadoMes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all EstadoMes" ON "EstadoMes";
CREATE POLICY "Allow all EstadoMes" ON "EstadoMes" FOR ALL USING (true) WITH CHECK (true);
