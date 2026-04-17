-- Limpiar datos DEMO / de prueba en LoginEvent
-- Supabase → SQL Editor → New query → Run
--
-- Paso 1 (recomendado): borra solo filas claramente falsas (IDs demo, bootstrap, etc.)

DELETE FROM "LoginEvent"
WHERE
  "userId" LIKE 'demo-%'
  OR "userId" = 'ejemplo-sistema'
  OR "userId" = 'user-demo-1'
  OR "username" ILIKE '%Registro de ejemplo (tabla recién creada)%'
  OR "userAgent" = 'OTA Dashboard — fila automática'
  OR ("username" ILIKE '%(ficticio)%' AND "userId" LIKE 'demo-fake-%');

-- Paso 2 (OPCIONAL): si además ejecutaste el seed que insertaba conexiones FALSAS
-- usando los mismos userId que los usuarios reales (Alexandra, Samuel, Golondrinas, MAPFRE)
-- y quieres borrar TODO el historial de LoginEvent de esos cuatro perfiles
-- (también se borrarían logins reales que hubiera ya registrados para ellos):
--
-- DELETE FROM "LoginEvent"
-- WHERE "userId" IN (
--   'user-alexandra',
--   'user-samuel',
--   'user-golondrinas',
--   'user-mapfre'
-- );
