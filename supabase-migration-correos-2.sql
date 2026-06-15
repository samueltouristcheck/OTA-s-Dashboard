-- Migración 2: permitir elegir destinatarios concretos en cada campaña.
-- Ejecuta esto en Supabase → SQL Editor.
-- Si "destinatarios" es null/vacío, se envía a TODOS los clientes con email.

alter table "EmailCampaign" add column if not exists "destinatarios" jsonb;
