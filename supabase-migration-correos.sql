-- Migración: envío de correos a clientes (panel SuperAdmin)
-- Ejecuta esto en Supabase → SQL Editor.

-- 1) Email de contacto por cliente (lo rellena el SuperAdmin desde el panel)
alter table "Cliente" add column if not exists "email" text;

-- 2) Campañas de correo programadas
create table if not exists "EmailCampaign" (
  "id" uuid primary key default gen_random_uuid(),
  "asunto" text not null,
  "cuerpo" text not null,
  "idioma" text not null default 'es',
  "fechaEnvio" date not null,
  "estado" text not null default 'pendiente',   -- pendiente | enviado | error
  "creadoPor" text,
  "createdAt" timestamptz not null default now(),
  "sentAt" timestamptz,
  "resultado" jsonb,
  "destinatarios" jsonb   -- emails concretos; null/vacío = todos los clientes con email
);

alter table "EmailCampaign" add column if not exists "destinatarios" jsonb;

create index if not exists "EmailCampaign_pendientes_idx"
  on "EmailCampaign" ("estado", "fechaEnvio");
