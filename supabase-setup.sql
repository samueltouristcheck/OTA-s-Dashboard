-- Ejecuta este SQL en Supabase: SQL Editor → New query → Pegar y Run
-- Crea las tablas que necesita la app
--
-- IMPORTANTE: Si "Can't reach database server" al usar la app, cambia DATABASE_URL
-- en .env a la conexión del POOLER (IPv4):
-- Supabase → Project Settings → Database → Connection string → Session mode
-- Copia la URI y úsala en .env (usa el puerto 5432 o 6543 del pooler, no el directo)

-- Tabla Cliente
CREATE TABLE IF NOT EXISTS "Cliente" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "nombre" TEXT NOT NULL UNIQUE
);

-- Tabla User
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "clienteId" TEXT,
  CONSTRAINT "User_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
);

-- Tabla Venta
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

-- Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS "User_clienteId_idx" ON "User"("clienteId");
CREATE INDEX IF NOT EXISTS "Venta_clienteId_idx" ON "Venta"("clienteId");
CREATE INDEX IF NOT EXISTS "Venta_ano_idx" ON "Venta"("ano");
