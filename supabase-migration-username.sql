-- Migración: añadir username para login por usuario
-- Ejecuta en Supabase → SQL Editor si ya tienes la tabla User con columna email

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT UNIQUE;

-- Migrar: username = email para usuarios existentes
UPDATE "User" SET "username" = COALESCE("email", "id") WHERE "username" IS NULL;

-- Super admin: admin@2ota.com
UPDATE "User" SET "username" = 'admin@2ota.com', "email" = 'admin@2ota.com' WHERE "id" = 'user-admin';
