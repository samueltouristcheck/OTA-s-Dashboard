-- Registro de conexiones (login). Ejecuta en Supabase → SQL Editor → Run
-- Una fila por cada inicio de sesión correcto.

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

ALTER TABLE "LoginEvent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all LoginEvent" ON "LoginEvent";
CREATE POLICY "Allow all LoginEvent" ON "LoginEvent" FOR ALL USING (true) WITH CHECK (true);
