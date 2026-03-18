-- Si ya tienes las tablas, ejecuta solo esto en SQL Editor para permitir acceso
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cliente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Venta" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all User" ON "User";
DROP POLICY IF EXISTS "Allow all Cliente" ON "Cliente";
DROP POLICY IF EXISTS "Allow all Venta" ON "Venta";
CREATE POLICY "Allow all User" ON "User" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all Cliente" ON "Cliente" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all Venta" ON "Venta" FOR ALL USING (true) WITH CHECK (true);
