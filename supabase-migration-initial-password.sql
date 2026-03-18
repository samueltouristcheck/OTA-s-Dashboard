-- Añade columna para mostrar contraseña inicial (solo para admin)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "initialPassword" TEXT;

-- Convención: usuario = nombre del cliente, contraseña = cliente123
UPDATE "User" SET "username" = 'Golondrinas', "initialPassword" = 'cliente123' WHERE "id" = 'user-golondrinas';
-- Si el login falla, llama POST /api/auth/seed-clientes para actualizar el hash
