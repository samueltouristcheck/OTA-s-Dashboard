-- TODO EN UNO: Ejecuta en Supabase → SQL Editor → New query → Pegar → Run
-- Crea tablas + usuarios + datos de prueba (sin usar Prisma)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tablas
CREATE TABLE IF NOT EXISTS "Cliente" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "nombre" TEXT NOT NULL UNIQUE,
  "logoUrl" TEXT
);

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "username" TEXT NOT NULL UNIQUE,
  "email" TEXT,
  "password" TEXT NOT NULL,
  "initialPassword" TEXT,
  "role" TEXT NOT NULL,
  "clienteId" TEXT,
  CONSTRAINT "User_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
);

CREATE TABLE IF NOT EXISTS "Venta" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clienteId" TEXT NOT NULL,
  "ota" TEXT NOT NULL,
  "tipoEntrada" TEXT NOT NULL,
  "mes" TEXT NOT NULL,
  "ano" INTEGER NOT NULL,
  "numeroEntradas" INTEGER NOT NULL,
  "producto" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
);

ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

CREATE INDEX IF NOT EXISTS "User_clienteId_idx" ON "User"("clienteId");
CREATE INDEX IF NOT EXISTS "Venta_clienteId_idx" ON "Venta"("clienteId");
CREATE INDEX IF NOT EXISTS "Venta_ano_idx" ON "Venta"("ano");

CREATE TABLE IF NOT EXISTS "LoginEvent" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "clienteNombre" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "LoginEvent_userId_idx" ON "LoginEvent"("userId");
CREATE INDEX IF NOT EXISTS "LoginEvent_createdAt_idx" ON "LoginEvent"("createdAt" DESC);

-- 2. Políticas RLS (permite acceso desde la app con anon key)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cliente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Venta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginEvent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all User" ON "User";
DROP POLICY IF EXISTS "Allow all Cliente" ON "Cliente";
DROP POLICY IF EXISTS "Allow all Venta" ON "Venta";
DROP POLICY IF EXISTS "Allow all LoginEvent" ON "LoginEvent";
CREATE POLICY "Allow all User" ON "User" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all Cliente" ON "Cliente" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all Venta" ON "Venta" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all LoginEvent" ON "LoginEvent" FOR ALL USING (true) WITH CHECK (true);

-- 3. Limpiar datos previos (si existen)
TRUNCATE "LoginEvent", "Venta", "User", "Cliente" CASCADE;

-- 4. Clientes
INSERT INTO "Cliente" ("id", "nombre") VALUES 
  ('cliente-golondrinas', 'Golondrinas'),
  ('cliente-mapfre', 'MAPFRE');

-- 5. Usuarios (login por username)
-- Super admins: Alexandra / Alexandra123, Samuel / Samuel123
-- Clientes: usuario = nombre del cliente, contraseña = cliente123
INSERT INTO "User" ("id", "username", "email", "password", "initialPassword", "role", "clienteId") VALUES 
  ('user-alexandra', 'Alexandra', 'alexandra@ota.com', crypt('Alexandra123', gen_salt('bf')), 'Alexandra123', 'admin', NULL),
  ('user-samuel', 'Samuel', 'samuel@ota.com', crypt('Samuel123', gen_salt('bf')), 'Samuel123', 'admin', NULL),
  ('user-golondrinas', 'Golondrinas', 'golondrinas@ota.com', crypt('cliente123', gen_salt('bf')), 'cliente123', 'client', 'cliente-golondrinas'),
  ('user-mapfre', 'MAPFRE', 'mapfre@ota.com', crypt('cliente123', gen_salt('bf')), 'cliente123', 'client', 'cliente-mapfre');

-- 6. Ventas de ejemplo
INSERT INTO "Venta" ("clienteId", "ota", "tipoEntrada", "mes", "ano", "numeroEntradas", "producto") VALUES
  ('cliente-golondrinas', 'Tiqets', 'General', '01. Enero', 2024, 150, '40 Minutos'),
  ('cliente-golondrinas', 'GetYourGuide', 'Niño', '01. Enero', 2024, 45, '60 Minutos'),
  ('cliente-golondrinas', 'Viator', 'Reducido', '02. Febrero', 2024, 80, '90 Minutos'),
  ('cliente-mapfre', 'Tiqets', 'General', '01. Enero', 2024, 220, '40 Minutos'),
  ('cliente-mapfre', 'Musement', 'Niño', '03. Marzo', 2024, 65, '60 Minutos');
