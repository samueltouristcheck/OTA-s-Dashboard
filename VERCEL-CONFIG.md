# Configuración de Vercel - Variables de Entorno

## Dónde añadir las variables

1. En el **Dashboard de Vercel** → tu proyecto **OTA-s-Dashboard**
2. Ve a **Settings** → **Environment Variables**
3. Añade cada variable (Name + Value)

---

## Variables a configurar

### 1. Supabase / Base de datos

| Name | Value | Entornos |
|------|-------|----------|
| `DATABASE_URL` | Copia el valor de tu `.env` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | Copia el valor de tu `.env` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Copia el valor de tu `.env` | Production, Preview, Development |

### 2. JWT / Autenticación

| Name | Value | Entornos |
|------|-------|----------|
| `JWT_SECRET` | Copia el valor de tu `.env` | Production, Preview, Development |

⚠️ **Recomendación:** Genera un secreto más seguro para producción:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Google Sheets

| Name | Value | Entornos |
|------|-------|----------|
| `GOOGLE_SHEETS_ID` | Copia el valor de tu `.env` | Production, Preview, Development |
| `GOOGLE_SHEETS_TAB` | Copia el valor de tu `.env` | Production, Preview, Development |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | *(ver abajo)* | Production, Preview, Development |

---

## ⚠️ GOOGLE_SERVICE_ACCOUNT_JSON (importante)

En Vercel **no puedes usar una ruta de archivo** (`GOOGLE_APPLICATION_CREDENTIALS`). Debes usar el JSON completo como variable.

### Pasos:

1. Abre el archivo `total-earth-459907-f0-8fc706a8ace4.json` (está en la raíz del proyecto)
2. Copia **todo el contenido** del archivo (es un JSON de una sola línea o varias)
3. En Vercel, crea la variable:
   - **Name:** `GOOGLE_SERVICE_ACCOUNT_JSON`
   - **Value:** pega el JSON completo **tal cual** (sin comillas alrededor, sin espacios extra al inicio/final)
4. Marca como **Sensitive** si Vercel lo ofrece

**Errores frecuentes:** No pongas comillas `"` alrededor del JSON. El valor debe empezar con `{` y terminar con `}`.

El JSON debe verse así (ejemplo):
```json
{"type":"service_account","project_id":"total-earth-459907-f0","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"crm-ota-s@total-earth-459907-f0.iam.gserviceaccount.com",...}
```

---

## Resumen rápido

| Variable | ¿Qué es? |
|----------|----------|
| `DATABASE_URL` | Conexión a PostgreSQL (Supabase) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase |
| `JWT_SECRET` | Secreto para tokens de sesión |
| `GOOGLE_SHEETS_ID` | ID de tu hoja de Google |
| `GOOGLE_SHEETS_TAB` | Nombre de la pestaña |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo de la Service Account (para Vercel) |

---

## Después de añadir las variables

1. Guarda cada variable
2. Ve a **Deployments** → haz un **Redeploy** del último deployment para que tome las nuevas variables
3. O haz un nuevo push a `main` para que se despliegue de nuevo
