# Guía de despliegue

## 1. Configuración

La app es un servidor Node.js único (`src/server/server.ts`) que sirve tanto la API (`/api/*`) como el
frontend estático (`public/`). No requiere un proceso de build de JavaScript del lado del frontend (es
vanilla, sin bundler); solo el CSS pasa por Tailwind CLI (`npm run build:css`).

```bash
npm install
npm run build   # compila CSS + TypeScript a dist/
npm start       # sirve desde dist/, usando PORT (por defecto 4100)
```

## 2. Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No (default 4100) | Puerto HTTP del servidor. |
| `NODE_OPTIONS` | Recomendada | `--experimental-sqlite` en versiones de Node donde `node:sqlite` aún requiere el flag explícito. |

La herramienta no tiene login (decisión explícita del usuario: el inspector abre la app y trabaja de
inmediato) — no hay credenciales que gestionar ni `AUTH_SECRET` que configurar hoy. `src/server/auth.ts`
y la tabla `users` quedan en el código, sin usarse, como base para activar control de acceso
multi-inspector/administrador más adelante (ver `docs/ANALISIS-Y-ARQUITECTURA.md`, "Escalabilidad
futura"); si se activa, ese es el momento de añadir `AUTH_SECRET` como variable de entorno.

## 3. Base de datos

La demostración usa SQLite nativo (`node:sqlite`) en `data/edificaciones.sqlite`, creada automáticamente
al arrancar (`src/db/db.ts` ejecuta `schema.sql` si las tablas no existen) y sembrada con usuarios y
datos de ejemplo si está vacía (`autoSeedIfEmpty` en `src/server/server.ts`).

**Para producción real** se recomienda migrar a PostgreSQL con Prisma:

1. Provisionar una base PostgreSQL (Render, Railway, Supabase, RDS, etc.).
2. `npm install prisma @prisma/client`, configurar `DATABASE_URL`.
3. `npx prisma migrate dev` usando `prisma/schema.prisma` (ya incluido y listo).
4. Reescribir `src/db/queries.ts` para usar `PrismaClient` en vez de `node:sqlite` — el resto de la
   aplicación (`src/domain`, `src/server` rutas, frontend) no necesita cambios. Ver
   `docs/manual_tecnico.md` §7.

## 4. Almacenamiento de fotografías

En la demostración, las fotos se guardan como archivos en `public/uploads/<inspectionId>/`. Esto es
sencillo pero **no persiste** en plataformas de hosting sin disco (el nivel gratis de Render, por
ejemplo, reinicia el sistema de archivos en cada redeploy).

**Para producción real**, dos opciones:

- **Disco persistente** (Render plan pago, o cualquier VM con disco propio): montar un volumen en
  `public/uploads` (ver bloque comentado en `render.yaml`). Simple, pero no escala a múltiples instancias.
- **Almacenamiento en la nube** (recomendado, S3 o equivalente — Cloudflare R2, Backblaze B2, DigitalOcean
  Spaces): reemplazar `saveDataUrlPhoto()` en `src/server/server.ts` por una subida al bucket y guardar
  la URL pública (o firmada) resultante en `photos.url`. El resto del modelo de datos ya está preparado
  para esto (`url` es un campo de texto libre).

## 5. Build

```bash
npm run build
```

Ejecuta, en orden: compilación de Tailwind CSS (`public/styles.css`, minificado), compilación de
TypeScript (`dist/`), y copia de `src/db/schema.sql` a `dist/db/schema.sql` (no lo procesa `tsc` por ser
SQL crudo).

## 6. Deploy en Render (plan "starter" + disco persistente, listo para usar)

El proyecto incluye [`render.yaml`](../render.yaml):

1. Sube el proyecto a un repositorio Git (GitHub/GitLab).
2. En [render.com](https://render.com): "New" → "Blueprint" → conecta el repositorio.
3. Render detecta `render.yaml` y crea el servicio (plan "starter", ~$7/mes, con dos discos persistentes
   de 1GB cada uno: base de datos y fotos subidas).
4. Espera el build (2-3 min) y abre la URL asignada (`https://<nombre>.onrender.com`).

Con esta configuración la base de datos y las fotos **sí persisten** entre redeploys/reinicios — no hace
falta ninguna migración manual a PostgreSQL ni a almacenamiento en la nube para tener persistencia real
(aunque siguen siendo alternativas válidas si el proyecto crece a múltiples instancias, ver secciones 3 y
4 arriba).

**Si prefieres el plan gratuito** (sin costo, pero sin persistencia real): cambia `plan: starter` a
`plan: free` y quita el bloque `disks:` en `render.yaml` antes de desplegar — la base de datos y las
fotos se reiniciarán en cada redeploy/inactividad prolongada, y la app se auto-siembra con datos de
ejemplo para seguir funcional (`autoSeedIfEmpty`), pero cualquier inspección real capturada se perderá.

**Cuidado con los límites de uso del plan gratuito**: la cuenta puede quedar suspendida por Render al
superar el uso incluido (horas de cómputo, transferencia de datos) del nivel gratuito — si eso pasa, el
servicio deja de responder por completo (ni siquiera muestra un error de la app, sino un aviso de Render)
hasta reactivarlo o pasar a un plan pago.

### Alternativas de hosting

Cualquier plataforma que ejecute Node.js ≥ 22.5 funciona igual de bien: Railway, Fly.io, DigitalOcean App
Platform, un VPS propio con `pm2`/`systemd`, etc. — el `buildCommand`/`startCommand` de `render.yaml` son
directamente reutilizables (`npm install && npm run build` / `npm start`).

## 7. Dominio y HTTPS

Render (y la mayoría de plataformas equivalentes) provisiona automáticamente un certificado HTTPS para el
subdominio `*.onrender.com` y para cualquier dominio propio que conectes desde su panel ("Custom
Domains"), sin configuración adicional del lado de la app. La app no asume un dominio fijo: todas las
rutas y llamadas a la API son relativas.

## 8. Mantenimiento

- **Actualizar dependencias**: `npm outdated` / `npm update` periódicamente; revisar el changelog de
  `pdfkit` y `tailwindcss` antes de saltos de versión mayor.
- **Rotar `AUTH_SECRET`**: invalida todas las sesiones activas (los usuarios deben volver a iniciar
  sesión) — útil si se sospecha una fuga.
- **Backups**: si migras a PostgreSQL, programa backups automáticos del proveedor (la mayoría de
  plataformas gestionadas los incluyen). En SQLite sobre disco persistente, respaldar
  `data/edificaciones.sqlite` y `public/uploads/` periódicamente.
- **Monitoreo**: revisar los logs del servidor (`console.error` ya captura errores no manejados por
  ruta) y el uso de disco si se usa almacenamiento local de fotos.
