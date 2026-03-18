# Arreglar conexión a Supabase

El error "Can't reach database server" suele deberse a que la conexión directa usa **IPv6** y tu red no lo soporta.

## Solución: usar el Pooler (IPv4)

1. Entra en **Supabase** → tu proyecto → **Project Settings** → **Database**
2. Baja hasta **Connection string**
3. Elige **Session** (o **Transaction** si prefieres)
4. Copia la **URI** completa
5. Sustituye `[YOUR-PASSWORD]` por tu contraseña de base de datos
6. Pega esa URI en tu `.env` como `DATABASE_URL`

La URI del pooler tendrá un formato similar a:
```
postgresql://postgres.dupaopglvhpkgdylmpll:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```
(o puerto 6543 si usas Transaction mode)

## Pasos completos

1. **Crear tablas**: En Supabase → SQL Editor → ejecuta el contenido de `supabase-setup.sql`
2. **Actualizar .env**: Usa la URI del pooler (Session o Transaction) en `DATABASE_URL`
3. **Crear usuarios**: Ejecuta `npx prisma db seed`
4. **Arrancar**: `npm run dev`
