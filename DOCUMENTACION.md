# Dashboard de ventas OTAs — Documentación

Cómo funciona el dashboard: qué hace cada pantalla, cómo se hacen las tareas del día a día y cómo
está montado por dentro.

Última revisión: julio 2026.

---

## 1. Qué es

Una aplicación web donde se centralizan las ventas de entradas de ~20 museos y atracciones vendidas a
través de OTAs (Fever, GetYourGuide, Tiqets, Musement, Civitatis…).

Tiene dos caras:

- **Interna (Touristcheck).** Alexandra mete las ventas de cada museo y lleva el seguimiento de qué se
  ha enviado y qué se ha facturado.
- **Cliente (cada museo).** Cada museo entra con su usuario y ve **solo sus** ventas: totales,
  evolución por meses, reparto por OTA, por tipo de entrada y por producto, y comparativas entre años.

**Estado actual de los datos:** 118.870 entradas en 4.850 filas, de 2023 a 2026, con 22 clientes
(18 con acceso al dashboard).

---

## 2. De dónde salen los datos

**La base de datos es la fuente.** Lo que Alexandra escribe en el dashboard es lo que ven los clientes.
No hay ningún paso intermedio.

Hasta julio de 2026 el circuito era: Excel por cliente → pestaña `Auto` → copiar y pegar a mano en la
hoja "Ventas Otas (respuestas)" → dashboard. Cada paso manual era una ocasión de error, y los generó:
la hoja tenía "VINSEUM" y "Vinseum" como dos clientes distintos, y las ventas del Hash Museum de 2024
nunca llegaron a pegarse.

Los Excels antiguos (`Ventas OTAs 2024/2025/2026`) siguen en Drive como archivo histórico, pero **ya no
alimentan nada**. La lectura de Google Sheets se ha dejado en el código por si algún día hace falta
comprobar algo (`npm run comparar`), pero las rutas que escribían están desactivadas.

---

## 3. Quién entra y qué ve

| Rol | Quién | Qué ve |
|---|---|---|
| **Super admin** | Alexandra, Samuel | Todo, incluidas las pantallas de Usuarios, Correos y Registro de uso |
| **Admin** | — | Todos los clientes y todas las ventas |
| **Cliente** | Cada museo | Solo sus propias ventas |

El filtro por cliente se aplica **en el servidor**, no escondiendo cosas en la pantalla: un museo no
puede ver los datos de otro ni manipulando la petición. Si un usuario cliente no tiene cliente asignado,
no ve **nada** (antes veía las ventas de todos).

---

## 4. Las pantallas

### Dashboard (`/dashboard`)

La pantalla principal. KPIs, evolución mensual, reparto por OTA y por tipo de entrada, tabla resumen y
comparativas interanual e intermensual. Todos los gráficos comparten los filtros de arriba: año, mes,
OTA, tipo de entrada y producto (se puede elegir más de un valor en cada uno).

El filtro de producto solo aparece si el cliente tiene más de un producto: no tiene sentido enseñarlo a
quien solo vende entrada general.

### Datos mensuales (`/dashboard/datos-mensuales`) — admin

**Aquí se meten las ventas.** Tiene la misma forma que el Excel: eliges cliente y año, y sale una
parrilla con los **12 meses en columnas** y una fila por cada combinación de OTA, producto y tipo de
entrada, con totales por fila y por mes.

- **Añadir fila** — para una combinación nueva.
- **Copiar filas de [año anterior]** — trae la estructura del año pasado sin los números, para no
  empezar enero en blanco.
- **Guardar** — solo manda las celdas que han cambiado. El botón indica cuántas.
- Una celda **vacía no es un 0**: vacía significa que no hay dato y no se guarda ninguna fila.

Si cambias la OTA, el producto o el tipo de una fila que ya existía, se borra la vieja y se escribe la
nueva; el número no se duplica.

### Panel de clientes (`/dashboard/panel`) — admin

El equivalente a la hoja `HOME` del Excel. Una fila por cliente con:

- Población, contacto de ventas, email e info.
- Enlaces al producto y al Looker.
- Dos tiras de 12 casillas: **ventas enviadas** y **facturas recibidas**, por año.
- **Filtro por región** (Barcelona, Manresa, Girona…), más una opción "(sin región)" para ver cuáles
  quedan por rellenar.

Se guarda solo, sin botón.

**Botón "Añadir cliente" → "Crear cliente y acceso":** da de alta el cliente, su usuario y su
contraseña de una vez, y enseña las credenciales con un botón de copiar y un enlace a su dashboard. Es
la forma normal de dar de alta un museo nuevo.

### Clientes (`/dashboard/clientes`) — admin

Listado de clientes con su usuario y su contraseña, y enlace al dashboard de cada uno.

### Usuarios (`/dashboard/usuarios`) — super admin

Para **cambiar la contraseña** de un cliente concreto, crearle el usuario a uno que no lo tenga, o
borrar un usuario.

### Correos (`/dashboard/correos`) — super admin

Campañas de correo a los clientes: se escribe el mensaje (hay plantillas en español, catalán e inglés),
se eligen destinatarios y una fecha, y queda programado. **Un cron de Vercel los envía cada día a las
7:00** desde el Gmail de Alexandra.

### Registro de uso (`/dashboard/registro-uso`) — super admin

Quién ha entrado y cuándo. Sirve para saber qué museos usan de verdad el dashboard — dato útil de cara
a renovaciones.

### Configuración (`/dashboard/config`)

- **Cliente:** su logo y cambiar su propia contraseña.
- **Super admin:** "Crear accesos que falten" (da de alta el usuario de los clientes que no tengan
  uno, **sin tocar las contraseñas existentes**) e importar un CSV de ventas.

### LaIa — el asistente

El chat de la esquina responde preguntas sobre las ventas en lenguaje normal ("compara 2024 con 2023",
"¿qué OTA vende más?"). Respeta el rol: a un cliente solo le contesta con sus datos. Usa `gpt-4o-mini`
y necesita `OPENAI_API_KEY`; si no está, el chat lo dice y el resto del dashboard funciona igual.

---

## 5. Tareas del día a día

### Dar de alta un museo nuevo

**Panel de clientes → Añadir cliente → Crear cliente y acceso.** Ya está: cliente, usuario, contraseña
y dashboard. Apunta la contraseña del recuadro verde (también queda en la pantalla de Clientes).

### Meter las ventas del mes

**Datos mensuales** → elige cliente y año → escribe los números en la columna del mes → **Guardar**.

Para un cliente que empieza el año: **Copiar filas de [año anterior]** y rellenar.

### Cambiar la contraseña de un cliente

**Usuarios** → busca su fila → escribe la nueva → guardar. Cada cliente tiene la suya; cambiarla no
afecta a los demás.

### Marcar que se han enviado las ventas o recibido la factura

**Panel de clientes** → casilla del mes correspondiente. Se guarda sola.

---

## 6. Por dentro

### Stack

Next.js 14 (App Router) · React · TypeScript · Tailwind · Recharts · Supabase (PostgreSQL) ·
autenticación propia con JWT y bcrypt · desplegado en Vercel.

El acceso a la base de datos se hace con `supabase-js`. **Prisma no se usa en tiempo de ejecución**:
`prisma/schema.prisma` está solo como documentación del modelo. Las migraciones que se aplican de verdad
son los ficheros `supabase-*.sql` de la raíz, ejecutados a mano en el SQL Editor de Supabase.

### Modelo de datos

| Tabla | Qué guarda |
|---|---|
| `Cliente` | Museo: nombre, siglas, activo, población, contactos, enlaces |
| `Venta` | Una fila por cliente/OTA/tipo/producto/mes/año, con el número de entradas |
| `User` | Acceso: usuario, hash de la contraseña, rol y a qué cliente pertenece |
| `EstadoMes` | Casillas de ventas enviadas / factura recibida por cliente, año y mes |
| `EmailCampaign` | Campañas de correo programadas |
| `LoginEvent` | Un registro por cada entrada al dashboard |

**La clave natural de `Venta`** — `(clienteId, ota, tipoEntrada, producto, mes, ano)` — es única. Es lo
que permite que la parrilla guarde celda a celda y que la migración se pueda repetir sin duplicar nada.
Su ausencia es lo que dejó seis copias de cada venta en su día.

**`Cliente.activo`** distingue los clientes con perfil de los que no lo tienen. De Alsa, Fundació Miró,
Castell d'Hostalric y Museu d'Art Prohibit **se guardan las ventas pero no salen como cliente** ni
pueden entrar.

**Nombres canónicos** (`src/lib/clientes-sheet.ts`): "VINSEUM" y "Vinseum" son el mismo cliente, igual
que "Museu Tàpies" y "Fundació Tàpies", o "Bus Nàutic" y "Alsa". Todo lo que crea clientes pasa por ahí
para no volver a duplicarlos.

### Organización del código

```
src/
  app/
    dashboard/…      pantallas internas
    vista-cliente/…  dashboard de un museo
    api/
      ventas/…       ventas: lectura, alta, edición por celda, stats
      clientes/…     clientes; clientes/alta = alta completa con acceso
      panel/         panel de gestión (HOME)
      auth/…         login, contraseñas
      sheets/…       lectura de Google Sheets (reserva; las de escritura, desactivadas)
  lib/
    stats.ts         cálculo de estadísticas y filtros (compartido)
    ventas-db.ts     lectura de ventas
    ventas-cliente.ts a qué cliente se restringe cada petición
    clientes-sheet.ts nombres canónicos y clientes sin perfil
    password.ts      generación de contraseñas
    auth.ts          JWT
scripts/             mantenimiento (ver abajo)
```

`src/lib/stats.ts` es la pieza que calcula totales, repartos y opciones de filtro. Está compartida
porque antes cada fuente tenía su copia y habían divergido: una ignoraba el filtro de tipo de entrada y
no aceptaba selección múltiple.

### Scripts de mantenimiento

```bash
npm run dev              # arrancar en local
npm run comparar         # compara la hoja de Google con la base de datos
npm run backup:ventas    # copia Venta y Cliente a backups/*.json
npm run migrar:ventas    # importa los Excels anuales (idempotente)
npm run test:stats       # comprobaciones de la lógica de estadísticas
npm run clientes:list    # lista los clientes de la hoja
```

`migrar:ventas` acepta `--prova` (no escribe, solo informa), `--any=2026` (un año) y
`--respostes --any=2023` (lee de la hoja de respuestas en vez del Excel, que es de donde salió 2023
porque no existe un "Ventas OTAs 2023").

### Variables de entorno

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a Supabase |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente de Supabase |
| `JWT_SECRET` | Firma de las sesiones |
| `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_TAB`, `GOOGLE_SERVICE_ACCOUNT_JSON` | Lectura de la hoja (solo scripts) |
| `OPENAI_API_KEY` | Asistente LaIa |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_FROM_*` | Envío de correos |
| `CRON_SECRET` | Protege el cron de correos |

En Vercel están en Settings → Environment Variables (ver `VERCEL-CONFIG.md`).

---

## 7. Cosas que hay que saber

### Pendientes de seguridad

1. **La clave de Google no está rotada.** La clave del service account
   `crm-ota-s@total-earth-459907-f0.iam.gserviceaccount.com` quedó expuesta y sigue activa. Hay que
   borrarla en Google Cloud Console, crear una nueva y actualizarla en `.env` y en Vercel.
2. **Las contraseñas están en texto plano** en la columna `initialPassword`, para que el panel pueda
   enseñárselas a Alexandra. El hash de `password` es correcto (bcrypt) y es el que valida el login,
   pero cualquiera con acceso a la base de datos ve las contraseñas de todos los museos. Lo correcto
   sería enseñarla solo al crearla y no volver a guardarla.

Ya cerrados en julio de 2026: la página pública `/setup` que publicaba las credenciales, tres rutas sin
autenticación que reseteaban contraseñas o creaban administradores, y una contraseña maestra en el login
(`cliente123`) que abría la cuenta de cualquier museo.

### Datos

- **Big Fun**: la pantalla de Clientes dice que su contraseña es `Bigfun123`, pero la que funciona es
  `cliente123`. Hay que decidir cuál debe ser.
- **Nombres de OTA inconsistentes**: conviven "Atrápalo"/"ATRÁPALO", "Get Your Guide"/"GYG",
  "Tixalia"/"TIxalia", "Hellotickets"/"Hellotcikets" (con la errata), "Smartbox"/"SmartBox"… El mismo
  problema que tuvimos con VINSEUM/Vinseum, pero con las OTAs: **los gráficos parten la misma OTA en
  dos barras**. Se arregla con una tabla de nombres canónicos, como la de clientes.
- **MAPFRE** está en Barcelona (KBR) y Madrid (Sala Recoletos) a la vez, pero es un solo cliente: el
  filtro por región no lo puede clasificar.
- **20 diferencias** entre el Excel y la hoja de respuestas (Golondrinas y Hash Museum de 2024, Museu de
  l'eròtica y Mas Miró de 2025) se resolvieron **a favor del Excel**. 2023 y 2026 cuadran exactos.
- **Museu Egipci** está dado de alta pero todavía no tiene ninguna venta.

---

## 8. Por dónde crece

Cada bloque nuevo de datos (reseñas, tráfico web, facturación…) encaja siguiendo el mismo patrón que ya
usa el módulo de ventas:

1. **Una tabla** en Supabase con `clienteId` y su clave natural única.
2. **Una ruta de API** en `src/app/api/…` que use `resolveClienteFilter()` para restringir por cliente.
   Es lo que garantiza que un museo no vea los datos de otro.
3. **Una pantalla** en `src/app/dashboard/…`, y su parte en el dashboard del cliente si es algo que él
   deba ver.
4. **Un script** de carga en `scripts/`, idempotente (upsert sobre la clave natural), si los datos
   entran de una fuente externa.

Lo que hay que respetar sí o sí es el punto 2: el filtro por cliente va **en el servidor**. Y si el
módulo se vende como extra, conviene que la tabla `Cliente` diga qué módulos tiene contratado cada uno,
para no depender de esconder botones en la pantalla.
