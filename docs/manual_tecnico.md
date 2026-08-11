# Manual Técnico

## 1. Arquitectura

```
┌─────────────────────┐      HTTP/JSON       ┌──────────────────────────┐
│  Frontend (public/)  │  ───────────────►    │  Servidor (src/server)   │
│  HTML/JS vanilla +   │  ◄───────────────    │  Node http nativo        │
│  Tailwind compilado  │                      │  Rutas /api/*            │
│  + Service Worker     │                      └────────────┬─────────────┘
└─────────────────────┘                                     │
                                              ┌──────────────▼─────────────┐
                                              │  src/db/queries.ts          │
                                              │  (capa de persistencia)     │
                                              └──────────────┬─────────────┘
                                                              │
┌────────────────────────────┐              ┌────────────────▼────────────┐
│  src/db (SQLite nativo)     │◄────────────►│  src/domain (puro)          │
│  schema.sql, db.ts, seed.ts │   consulta   │  catalog.ts, classification.ts│
└────────────────────────────┘              └──────────────────────────────┘
        ▲
        │ espejo funcional de
┌────────────────────────────┐
│  prisma/schema.prisma       │  ← modelo de datos objetivo (PostgreSQL)
│  sql/postgresql_schema.sql  │
└────────────────────────────┘
```

Principio central: **`src/domain` no importa nada de `src/db` ni de `src/server`**. Contiene los
catálogos cerrados del formulario y el motor de sugerencia de clasificación como funciones puras sobre
estructuras de datos en memoria — se puede probar con `node:test` sin servidor ni base de datos, y es
portable sin cambios a cualquier arquitectura de servidor (Next.js, NestJS, etc.).

## 2. Motor de sugerencia de clasificación

Ver `src/domain/classification.ts` y `docs/ANALISIS-Y-ARQUITECTURA.md` §3 (ambigüedad A1) para la
justificación completa. Resumen de las reglas:

**Escala a ROJO** si: colapso total = Sí · inclinación evidente = Sí · licuación/asentamiento del terreno
= Sí · movimientos en masa cercanos = Sí · severidad "S" en un elemento estructural crítico (columnas,
muros portantes, nodos, riostras).

**Escala a AMARILLO** si: colapso parcial = Sí o "No es claro" · riesgo por edificaciones adyacentes = Sí
o "No es claro" · severidad "M" en elemento crítico · severidad "S" en cualquier elemento no crítico.

**Nivel de daño**: severidad máxima observada en los elementos, con un piso de consistencia (si se sugiere
Rojo, el nivel de daño no puede quedar por debajo de Severo; si Amarillo, no por debajo de Moderado).

La sugerencia siempre queda expuesta como tal en la UI (`habitabilitySuggested` / `damageLevelSuggested`
en la base de datos) — el valor final que aparece en el informe es el que el inspector confirme o edite.

## 3. Referencia de la API HTTP

Ninguna ruta requiere autenticación (decisión explícita: la herramienta no tiene login — el inspector
abre la app y trabaja de inmediato). `src/server/auth.ts` y la tabla `users` quedan en el código sin
usarse, como base para activar control de acceso más adelante si el proyecto crece a multi-inspector con
roles — ver `docs/ANALISIS-Y-ARQUITECTURA.md`, "Escalabilidad futura".

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/catalog` | Catálogos cerrados del formulario (amenazas, usos, sistemas, elementos, recomendaciones) |
| GET | `/api/dashboard/stats` | Conteos para el panel |
| GET | `/api/inspections?status=` | Lista de inspecciones (filtro opcional por estado) |
| POST | `/api/inspections` | Crea una inspección (`id` opcional, generado en el cliente para uso offline) |
| GET | `/api/inspections/:id` | Detalle completo (todas las secciones + daños + fotos) |
| PATCH | `/api/inspections/:id` | Actualiza campos de valor único (cualquier paso del wizard, incluye víctimas/afectación humana) |
| DELETE | `/api/inspections/:id` | Elimina la inspección y sus fotos |
| POST | `/api/inspections/:id/status` | `{status}` → BORRADOR·EN_PROCESO·FINALIZADA·INFORME_GENERADO |
| PUT | `/api/inspections/:id/threat-types` | `{items:[{code,otherText}]}` — reemplaza el grupo completo |
| PUT | `/api/inspections/:id/building-uses` | ídem |
| PUT | `/api/inspections/:id/structural-systems` | ídem |
| PUT | `/api/inspections/:id/floor-systems` | ídem |
| PUT | `/api/inspections/:id/roof-support-systems` | ídem |
| PUT | `/api/inspections/:id/roof-types` | `{codes:[...]}` |
| PUT | `/api/inspections/:id/safety-recommendations` | `{items:[{code,otherText}]}` |
| PUT | `/api/inspections/:id/element-damages/:elementCode` | `{category, severity, otherLabel?}` — upsert por elemento |
| DELETE | `/api/inspections/:id/element-damages/:elementCode` | Elimina el registro de severidad de ese elemento |
| POST | `/api/inspections/:id/classify` | Ejecuta el motor de sugerencia y lo persiste en `*_suggested` |
| POST | `/api/inspections/:id/damage-records` | Crea un daño individual (extensión A4) |
| PATCH | `/api/damage-records/:id` | Edita un daño individual |
| DELETE | `/api/damage-records/:id` | Elimina un daño individual y sus fotos |
| POST | `/api/inspections/:id/photos` | `{dataUrl, kind, damageRecordId?, caption?, latitude?, longitude?}` |
| DELETE | `/api/photos/:id` | Elimina una foto (BD + archivo en disco) |
| GET | `/api/inspections/:id/report.pdf` | Genera y descarga el informe PDF rediseñado (portada con foto + logos + créditos); marca la inspección como INFORME_GENERADO |
| GET | `/api/inspections/:id/report-oficial.pdf` | Genera y descarga la réplica exacta del formulario oficial ("2A - Formulario regional homogenizado") diligenciada; marca la inspección como INFORME_GENERADO |
| GET | `/api/inspections/:id/report.csv` | Exporta la información estructurada de la inspección en CSV |

## 4. Fotografías

El cliente redimensiona cada foto a máx. 1600px de lado mayor / JPEG calidad 0.8 en un `<canvas>`
(`resizeImageToDataUrl` en `public/app.js`) antes de enviarla como data URL. El servidor la decodifica y
guarda en `public/uploads/<inspectionId>/<uuid>.<ext>` (`saveDataUrlPhoto` en `src/server/server.ts`).
Límite de body HTTP: 15 MB.

`kind` distingue el uso de cada foto: `PANORAMICA` (vista general, ligada a la inspección),
`DANIO` (ligada a un `damage_record`), `ESQUEMA_PLANTA` / `ESQUEMA_ELEVACION` (sección 11), `FIRMA`.

## 5. PWA y sincronización offline

- **Service Worker** (`public/sw.js`): cachea el app shell (HTML/CSS/JS/íconos) con estrategia
  cache-first (usando `{cache:"reload"}` al instalar, para no heredar una copia vieja de la caché HTTP
  del navegador), y aplica *network-first con respaldo en caché* a las lecturas `GET /api/*` (catálogo,
  detalle de inspección): intenta la red primero y solo cae a la caché si el fetch falla por falta de
  conexión. Se descartó *stale-while-revalidate* (servir siempre la caché primero) porque podía mostrar
  datos desactualizados justo después de que el propio cliente guardara un cambio en ese mismo recurso.
- **Cola de sincronización** (`public/offline.js`): toda operación de escritura (POST/PUT/PATCH/DELETE)
  que falle por ausencia de red (no por error HTTP del servidor) se encola en IndexedDB
  (`edificaciones-offline` / almacén `pendingRequests`) y se reintenta automáticamente al reconectar
  (evento `online`, más un respaldo por `setInterval` cada 20s).
- **IDs generados en el cliente**: para que el wizard pueda seguir navegando y encolando operaciones
  dependientes (subir una foto de un daño recién creado) sin esperar respuesta del servidor, las
  creaciones de inspección, daño individual y foto aceptan un `id` generado en el cliente
  (`window.newClientId()`, UUID v4). El servidor es idempotente ante ese `id` (si ya existe, no falla por
  clave duplicada — ver `createInspection`/`addDamageRecord`/`addPhoto` en `src/db/queries.ts`).

## 6. Auditoría / trazabilidad

Cada inspección conserva `created_at`, `updated_at`, `finalized_at`, `report_generated_at` y
`inspector_user_id`. El estado (`status`) progresa BORRADOR → EN_PROCESO → FINALIZADA → INFORME_GENERADO
sin retroceder automáticamente; el inspector puede seguir editando una inspección finalizada si necesita
corregir algo (no hay bloqueo de escritura por estado en esta versión).

## 7. Identidad visual del informe PDF y créditos

`src/server/reportPdf.ts` reproduce el encabezado (logos SNGRD / USAID / Miyamoto), la numeración de
secciones y el semáforo de colores del formulario impreso original — los tres logos y la franja de
sellos regionales (gobernaciones y alcaldías del Eje Cafetero) del pie de página se extrajeron
directamente del PDF fuente (`2A-Formulario regional homogenizado.pdf`) y viven en
`public/assets/logos/*.png`. El mismo footer institucional se muestra en la app web
(`renderFooter()` en `public/app.js`).

El informe agrega una portada propia (no está en el formulario impreso) con la fotografía panorámica de
la edificación como banner, y una sección final de "Créditos" que identifica la herramienta digital
(Ing. Cristhian Camilo Amariles López, Universidad Tecnológica de Pereira) — separada visualmente de los
logos oficiales para no confundir autoría de la herramienta con el origen del formulario. Ver la nota
completa de justificación en los comentarios de cabecera de `reportPdf.ts` y en
`docs/ANALISIS-Y-ARQUITECTURA.md`.

### 7.1 Formato oficial exacto ("2A - Formulario regional homogenizado")

`src/server/reportPdfOficial.ts` genera un segundo tipo de informe: **el PDF oficial original, literal**
(`assets/official-form/2a-formulario-regional-homogenizado.pdf`), cargado con `pdf-lib` y diligenciado
con los datos de la inspección superpuestos en las coordenadas exactas de cada casilla/campo. No es una
réplica — es el mismo archivo fuente con marcas dibujadas encima — así que el formato, la distribución,
los campos y los colores son los del documento oficial por construcción, no por imitación. Se ofrece como
alternativa al informe rediseñado — no lo reemplaza — para cuando el organismo de atención de desastres
exige recibir la información en su propio formato oficial.

Las coordenadas de las ~185 casillas y ~43 campos de texto del formulario (`src/server/officialFormCoords.ts`)
se obtuvieron por análisis geométrico de los vectores de dibujo del PDF (no de su texto, que es ilegible
por un cmap de fuente no estándar) y se verificaron cruzando cada una contra capturas numeradas del
formulario y contra el orden de opciones de `src/domain/catalog.ts`. Nota de coordenadas: el mapa está en
el sistema de PyMuPDF (origen arriba-izquierda, Y hacia abajo); `pdf-lib` dibuja en el espacio nativo del
PDF (origen abajo-izquierda, Y hacia arriba), así que cada Y se convierte con `alturaPágina - y` antes de
dibujar — ver `toY()` en `reportPdfOficial.ts`. Ver el detalle completo de esta decisión, incluida la
metodología de detección de casillas, en `docs/ANALISIS-Y-ARQUITECTURA.md` §11.

## 8. Guía visual de patologías (paso 5 del wizard)

`public/pathology-guide.js` define diagramas SVG **originales** (dibujados para esta herramienta, no
reproducciones de ninguna figura publicada) de patrones de daño típicos por elemento, tanto estructural
(columnas, muros portantes, vigas, nodos, riostras, entrepiso) como no estructural (los 12 elementos de la
sección 10: muros de fachada, divisorios, ventanales, cielo raso, cubiertas, escaleras, ascensores,
balcones, tanques elevados, instalaciones de gas/eléctricas, acueducto y alcantarillado) — 18 elementos en
total, 2 a 4 diagramas cada uno. Se muestran en un modal (botón "📖" junto a cada elemento en el paso 5)
para ayudar al inspector a reconocer el patrón antes de calificar la severidad, y ese mismo modal funciona
en modo selector dentro de "Detalle con foto" (botón "🔍 Elegir" en el campo "Tipo de daño" — ver
`openGuideModal()` en `public/inspection.html`, que decide el modo según si recibe un callback `onSelect`).
La organización por elemento se guio por la *Guía de Patologías Constructivas, Estructurales y No
Estructurales* (FOPAE-AIS, 3ª edición, 2011) — para los elementos no estructurales, en particular su
capítulo 4.3 (modos de falla: caída, volcamiento, deslizamiento, vaivén) y sus anexos de catálogo de
patologías — citada como referencia en el propio modal; no se reproduce ningún texto ni figura de ese
documento.

## 9. Migración a producción (Next.js/NestJS + PostgreSQL + Prisma)

1. `npm install prisma @prisma/client`, configurar `DATABASE_URL` y correr `npx prisma migrate dev` con
   `prisma/schema.prisma`.
2. Traducir `src/db/seed.ts` a un seed de Prisma (mismo contenido, cambiando SQL crudo por
   `prisma.user.create(...)`, etc.).
3. **Copiar `src/domain/*.ts` sin cambios** — es puro y no conoce SQLite, PostgreSQL ni Node `http`.
4. Reemplazar `src/server/auth.ts` por JWT real; la forma de los claims (`sub`, `email`, `role`, `exp`)
   ya es compatible.
5. Reemplazar el frontend vanilla por componentes React/Next.js si se desea, reutilizando las mismas
   rutas `/api/*` (o migrándolas a Server Actions / React Query).
6. Reemplazar el almacenamiento de fotos en disco (`public/uploads`) por un bucket (S3 o equivalente) —
   ver `docs/DESPLIEGUE.md`.
