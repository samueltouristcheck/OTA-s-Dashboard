# Resetear contraseña y conexión Supabase

## Copiar la cadena EXACTA desde Supabase

1. **Supabase** → tu proyecto → **Project Settings** → **Database**
2. Haz clic en el botón **"Connect"** (o busca "Connection string")
3. Elige **Session** o **Transaction**
4. Copia la **URI completa** (no la construyas a mano)
5. Sustituye solo `[YOUR-PASSWORD]` por tu contraseña
6. Pega en `.env` como `DATABASE_URL`

---

## Resetear contraseña

1. Entra en **Supabase** → tu proyecto
2. **Project Settings** (engranaje) → **Database**
3. Busca **Database password**
4. Clic en **Reset database password**
5. Copia la **nueva contraseña** (guárdala, solo se muestra una vez)
6. Actualiza tu `.env`:
   ```
   DATABASE_URL="postgresql://postgres.dupaopglvhpkgdylmpll:NUEVA_CONTRASEÑA@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"
   ```
7. Sustituye `NUEVA_CONTRASEÑA` por la contraseña que copiaste

**Si la contraseña tiene caracteres especiales** (@, #, =, etc.), codifícalos en la URL:
- `@` → `%40`
- `#` → `%23`
- `=` → `%3D`

Mejor: usa una contraseña solo con letras y números al resetear.
