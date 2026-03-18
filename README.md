# OTA Sales Dashboard

Dashboard de ventas de entradas de museos. Visualiza ventas por OTA, tipo de entrada, mes y producto.

## Requisitos

- Node.js 18+
- PostgreSQL

## Instalación

```bash
npm install
```

Copia `.env.example` a `.env` y configura:

```
DATABASE_URL="postgresql://user:password@localhost:5432/ota_sales?schema=public"
JWT_SECRET="tu-secreto-jwt"
```

## Base de datos

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

## Ejecutar

```bash
npm run dev
```

Abre http://localhost:3000

**Usuarios de prueba:**
- Admin: `admin@ota.com` / `admin123`
- Cliente: `golondrinas@ota.com` / `client123`

## Google Sheets

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Activa la **Google Sheets API**
3. Crea una **Service Account** y descarga el JSON
4. Guarda el archivo como `google-credentials.json` en la raíz del proyecto (o usa `GOOGLE_SERVICE_ACCOUNT_JSON` en .env)
5. Comparte tu hoja de Google Sheets con el email de la Service Account (permiso de editor)
6. Añade a `.env`:
   ```
   GOOGLE_SHEETS_ID="1gWkTIdz00NCP1Onwn9L3_I4giNb5aeVFJzYdBb4vDSc"
   GOOGLE_SHEETS_TAB="Respuestas de formulario 1"
   GOOGLE_APPLICATION_CREDENTIALS="./google-credentials.json"
   ```
7. En **Configuración** del dashboard, pulsa "Sincronizar ahora"

El ID de la hoja está en la URL: `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`

## Importar CSV

Desde la terminal:
```bash
npm run import:csv data/ejemplo-ventas.csv
```

O desde **Configuración** en el dashboard (admin).

Formato CSV esperado: `Cliente,OTA,Tipo de Entrada,Mes respuesta,Número de entradas,Producto,Año`

## Estructura

- `/dashboard` - Dashboard con KPIs y gráficos
- `/dashboard/filtros` - Filtros avanzados y exportar CSV
- `/dashboard/config` - Configuración: sincronizar Google Sheets o importar CSV (solo admin)
