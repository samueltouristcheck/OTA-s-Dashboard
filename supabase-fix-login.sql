-- FIX LOGIN: Ejecuta en Supabase → SQL Editor
-- Asegura que la tabla User tenga username y crea el admin con hash compatible

-- 1. Añadir columna username si no existe
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT UNIQUE;

-- 2. Migrar email → username para filas existentes
UPDATE "User" SET "username" = COALESCE("email", "id") WHERE "username" IS NULL;

-- 3. Eliminar admin anterior (por si tiene hash incompatible)
DELETE FROM "User" WHERE "id" = 'user-admin';

-- 4. Insertar admin con hash de PostgreSQL (crypt)
-- Si sigue fallando, llama a POST /api/auth/seed-admin para crear con bcrypt de Node
INSERT INTO "User" ("id", "username", "email", "password", "role", "clienteId") VALUES 
  ('user-admin', 'admin@2ota.com', 'admin@2ota.com', crypt('admin123', gen_salt('bf')), 'admin', NULL);
