-- Migración 3: guardar las plantillas de correo editadas (por idioma).
-- Ejecuta esto en Supabase → SQL Editor.

create table if not exists "PlantillaCorreo" (
  "idioma" text primary key,         -- 'es' | 'ca' | 'en'
  "asunto" text not null,
  "cuerpo" text not null,
  "updatedAt" timestamptz not null default now()
);
