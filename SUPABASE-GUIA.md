# Cómo encontrar los datos de conexión en Supabase

## Opción 1: Connection string completa (más fácil)

1. Entra en [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto (**dupaopglvhpkgdylmpll**)
3. En el menú lateral izquierdo, haz clic en **Project Settings** (icono de engranaje abajo)
4. En el submenú, entra en **Database**
5. Baja hasta la sección **Connection string**
6. Elige **URI** (no Session pooler ni Transaction pooler)
7. Haz clic en **Copy** para copiar la cadena completa
8. Pega esa cadena en tu `.env` como valor de `DATABASE_URL`:

   ```
   DATABASE_URL="postgresql://postgres.xxxxx:TU_PASSWORD@db.dupaopglvhpkgdylmpll.supabase.co:5432/postgres"
   ```

---

## Opción 2: Obtener solo la contraseña

1. **Project Settings** → **Database**
2. Busca la sección **Database password**
3. Si no la recuerdas, haz clic en **Reset database password**
4. Copia la nueva contraseña
5. En tu `.env`, reemplaza `[TU_PASSWORD]` en la línea de `DATABASE_URL`:

   ```
   DATABASE_URL="postgresql://postgres:[TU_PASSWORD]@db.dupaopglvhpkgdylmpll.supabase.co:5432/postgres"
   ```

   Sustituye `[TU_PASSWORD]` por la contraseña que copiaste.

---

## Ruta visual

```
Dashboard → Tu proyecto → Project Settings (engranaje) → Database
                                                          ├── Database password
                                                          └── Connection string → URI → Copy
```

---

## Nota sobre caracteres especiales

Si la contraseña tiene símbolos como `=`, `#`, `@`, etc., puede que tengas que codificarlos en la URL. Si da error de conexión, prueba a cambiar la contraseña por una más simple (solo letras y números) en Supabase.
