# OTA Sales Dashboard

Dashboard de ventas de entradas de museos vendidas a través de OTAs. Cada museo entra y ve sus ventas
por OTA, tipo de entrada, mes y producto; internamente se meten los datos y se lleva el seguimiento de
envíos y facturación.

📖 **[DOCUMENTACION.md](DOCUMENTACION.md)** — cómo funciona, pantalla por pantalla, y cómo está montado
por dentro. Empieza por ahí.

## Puesta en marcha

```bash
npm install
cp .env.example .env    # y rellena los valores (ver DOCUMENTACION.md § 6)
npm run dev
```

Abre http://localhost:3000

Las ventas viven en Supabase (PostgreSQL). El esquema se aplica ejecutando los ficheros
`supabase-*.sql` en el SQL Editor de Supabase; `prisma/schema.prisma` está solo como documentación del
modelo, no se usa en tiempo de ejecución.

## Comandos

```bash
npm run dev              # desarrollo
npm run build            # compilar
npm run comparar         # comparar la hoja de Google con la base de datos
npm run backup:ventas    # copia de seguridad de Venta y Cliente
npm run migrar:ventas    # importar los Excels anuales (se puede repetir sin duplicar)
npm run test:stats       # comprobaciones de la lógica de estadísticas
```

## Despliegue

Vercel. Las variables de entorno están en Settings → Environment Variables; ver
[VERCEL-CONFIG.md](VERCEL-CONFIG.md).

## Nota sobre Google Sheets

Hasta julio de 2026 los datos venían de una hoja de Google. **Ya no**: la fuente es la base de datos y
los datos se meten desde el propio dashboard. La lectura de la hoja se conserva por si hace falta
comprobar algo (`npm run comparar`), pero las rutas que escribían están desactivadas.
