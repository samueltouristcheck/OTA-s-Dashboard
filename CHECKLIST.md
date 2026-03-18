# Checklist - OTA Sales Dashboard

## 1. Crear archivo `.env`
Copia `.env.example` a `.env` y ajusta los valores:

```bash
copy .env.example .env
```

**Revisa:**
- `DATABASE_URL` – Usuario, contraseña y nombre de base de datos de PostgreSQL
- `JWT_SECRET` – Cualquier string aleatorio
- Google Sheets ya está configurado en el ejemplo

## 2. PostgreSQL
- Instala PostgreSQL si no lo tienes
- Crea la base de datos:
  ```sql
  CREATE DATABASE ota_sales;
  ```
- Actualiza `DATABASE_URL` en `.env` con tu usuario y contraseña

## 3. Compartir la hoja de Google
- Abre el JSON de la Service Account y busca el campo `client_email`
- Comparte tu Google Sheet con ese email (ej: `xxx@total-earth-459907-f0.iam.gserviceaccount.com`)
- Dale permiso de **Editor**

## 4. Instalar y ejecutar
```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

## 5. Probar
- Abre http://localhost:3000
- Login: `admin@ota.com` / `admin123`
- Ve a **Configuración** → **Sincronizar ahora** para importar desde Google Sheets
