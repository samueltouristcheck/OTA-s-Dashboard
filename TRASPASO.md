# Traspaso — qué hay, dónde está y quién manda

Inventario de todo lo que hace falta para mantener el dashboard, para que cualquiera pueda cogerlo si
la persona que lo lleva no está.

**En este fichero no hay ninguna contraseña ni clave**, y no debe haberla nunca: está en el repositorio
y quien vea el repositorio no tiene por qué tener acceso a los servicios. Aquí se dice **qué existe y
quién es el dueño**; las claves van en el gestor de contraseñas de la empresa.

Última revisión: julio de 2026.

---

## 1. Lo primero: el riesgo real

**El repositorio está en una cuenta personal.**

```
github.com/samueltouristcheck/OTA-s-Dashboard
```

Si esa cuenta desaparece o se cierra, **la empresa se queda sin el código**. No es una hipótesis
remota: es lo que pasa por defecto el día que alguien se va.

Lo mismo vale para el resto de servicios: hay que comprobar, uno por uno, si están a nombre de una
persona o de una cuenta de la empresa.

**Qué hacer, por orden:**

1. **Transferir el repositorio** a una organización de GitHub de Touristcheck
   (Settings → General → Transfer ownership). El histórico y los enlaces se mantienen.
2. Comprobar que **al menos dos personas** tienen acceso de administrador a cada servicio de la tabla
   de abajo.
3. Meter todas las claves en el **gestor de contraseñas de la empresa**, no en un `.env` de un portátil.

Mientras esto no esté hecho, el proyecto depende de una persona.

---

## 2. Los servicios

| Servicio | Qué es | Identificador | ¿A nombre de quién? |
|---|---|---|---|
| **GitHub** | El código | `samueltouristcheck/OTA-s-Dashboard` | ⚠️ cuenta personal — **transferir** |
| **Vercel** | Donde corre la web | proyecto `OTA-s-Dashboard` | comprobar |
| **Supabase** | La base de datos (todas las ventas) | proyecto `dupaopglvhpkgdylmpll`, región `eu-central-1` | comprobar |
| **Google Cloud** | Lectura de las hojas de cálculo | proyecto `total-earth-459907-f0` | comprobar |
| **Gmail** | Envío de correos a clientes | `alexandra.touristcheck@gmail.com` | Alexandra |
| **OpenAI** | El asistente LaIa | — | comprobar de quién es la facturación |

**El más crítico es Supabase**: ahí viven las ventas de todos los museos desde 2023. Si se pierde ese
acceso, se pierde el producto. Los demás son reemplazables con trabajo; ese no.

### Cuentas de Google con cosas dentro

Los Excels históricos están en Drive, repartidos entre varias cuentas personales:

| Documento | Dueño |
|---|---|
| Ventas OTAs 2026 y 2025 | Alexandra (`alexandra.touristcheck@gmail.com`) |
| Ventas OTAs 2024 | Fernando M. (`fermatri@gmail.com`) |
| Ventas Otas (respuestas) | Pedro (`pedro.hubcityguides@gmail.com`) |

Ya no alimentan el dashboard, pero son el archivo histórico y el respaldo de los números de 2023-2026.
Convendría **copiarlos a un Drive de la empresa**: dos de las tres cuentas son de gente ajena al día a
día del proyecto.

---

## 3. Las claves

**No están en este fichero ni deben estar en el repositorio.** Los sitios donde viven:

- **Producción:** Vercel → proyecto → Settings → Environment Variables. Es la fuente buena.
- **En local:** el fichero `.env` de cada portátil (está en `.gitignore`, no se sube nunca).

Qué claves hay y para qué sirve cada una: `DOCUMENTACION.md` § 6 y `VERCEL-CONFIG.md`.

Para montar un portátil nuevo: copiar los valores de Vercel a un `.env` local. Con eso arranca todo.

### Pendiente de seguridad

La clave del service account de Google (`crm-ota-s@total-earth-459907-f0.iam.gserviceaccount.com`)
**quedó expuesta y sigue activa**. Hay que borrarla en Google Cloud Console → IAM → Cuentas de servicio
→ Claves, crear una nueva y actualizarla en Vercel y en el `.env`.

---

## 4. Si algo se rompe

**La web no carga.** Vercel → Deployments. Si el último despliegue falló, ahí está el error; se puede
volver al anterior con "Promote to Production".

**Un cliente no puede entrar.** Su contraseña está en la pantalla de Clientes del dashboard. Si no
cuadra, cambiársela desde Usuarios. No hay ningún botón que las resetee todas, y es a propósito.

**Los números salen mal o vacíos.** Comprobar primero que Supabase responde (entrar al panel de
Supabase). Después, `npm run comparar` enfrenta la base de datos con la hoja de Google antigua: si
cuadran, el problema no está en los datos.

**Se han borrado datos sin querer.** `npm run backup:ventas` hace una copia a `backups/*.json`. Hazla
**antes** de tocar nada raro. Para reconstruir el histórico desde los Excels:
`npm run migrar:ventas` (se puede repetir, no duplica).

**Los correos no salen.** El cron de Vercel corre cada día a las 7:00 (`vercel.json`). Si falla, suele
ser la contraseña de aplicación de Gmail, que caduca al cambiar la contraseña de la cuenta.

---

## 5. Lo que no está escrito en ningún sitio

Cosas que solo se saben por haberlas vivido, y que costarían días de averiguar:

- **La fuente son la base de datos, no los Excels.** Cambió en julio de 2026. Cualquier documento
  anterior que diga otra cosa está obsoleto.
- **Los nombres de cliente tienen alias** (`src/lib/clientes-sheet.ts`): "VINSEUM" y "Vinseum" son el
  mismo, "Museu Tàpies" es "Fundació Tàpies", "Bus Nàutic" es "Alsa". Si se crea un cliente saltándose
  esa función, aparece duplicado en el dashboard.
- **Cuatro clientes se guardan pero no salen**: Alsa, Fundació Miró, Castell d'Hostalric y Museu d'Art
  Prohibit tienen `activo = false`. Es intencionado.
- **La clave única de `Venta`** es lo que impide duplicar. En su día no existía y una sincronización
  ejecutada seis veces dejó seis copias de cada venta (437.299 entradas donde había 76.000). No
  quitarla.
- **MAPFRE es un cliente con dos sedes** (Barcelona y Madrid) y **Golondrinas y MAPFRE tienen ids que
  empiezan por `cliente-`**, que parecen falsos pero son reales. Hay una función que lo distingue
  (`esIdSinteticDeSheets`) y está cubierta por tests.
- **El único administrador de facto son Alexandra y Samuel**, por nombre de usuario, en
  `src/lib/super-admin.ts`. Si entra alguien nuevo al equipo, hay que añadirlo ahí.

---

## 6. Comprobación de que el traspaso está hecho

- [ ] El repositorio está en una organización de la empresa, no en una cuenta personal
- [ ] Dos personas como mínimo son administradoras de Vercel
- [ ] Dos personas como mínimo son administradoras de Supabase
- [ ] Dos personas como mínimo tienen acceso al proyecto de Google Cloud
- [ ] Todas las claves están en el gestor de contraseñas de la empresa
- [ ] La clave expuesta del service account de Google está rotada
- [ ] Los Excels históricos están copiados a un Drive de la empresa
- [ ] Alguien que no sea quien lo montó ha conseguido arrancarlo en local siguiendo el README
