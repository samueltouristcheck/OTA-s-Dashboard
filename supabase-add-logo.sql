-- Ejecuta en Supabase → SQL Editor → New query → Pegar → Run
-- Añade la columna logoUrl a Cliente si no existe (para el logo en el dashboard)

ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
