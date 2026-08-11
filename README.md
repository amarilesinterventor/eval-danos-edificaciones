# Herramienta de Evaluación Rápida de Daños en Edificaciones

Aplicación web para la inspección rápida de edificaciones tras eventos que puedan generar daños
estructurales o no estructurales (sismos, inundaciones, movimientos en masa, incendios, vendavales,
etc.), implementada digitalmente a partir del **Formulario Regional para Evaluación Rápida de Daños en
Edificaciones** (V.1.0 - 03/2023) del Sistema Nacional de Gestión del Riesgo de Desastres.

Un inspector abre la app y trabaja de inmediato — **sin cuentas ni contraseñas** — completando el
levantamiento desde un celular, tablet o computador con navegador: identificación de la edificación,
víctimas y afectación humana, ubicación GPS, sistema estructural, checklist de daños por elemento con
semáforo de severidad y guía visual de patologías, fotografías, clasificación de habitabilidad,
recomendaciones y generación automática de informes en PDF — el rediseñado (con portada, foto de la
edificación y créditos institucionales) y, si el organismo de atención de desastres lo exige, una réplica
exacta del formulario oficial diligenciada — funcionando incluso sin conexión a internet en campo (PWA con
cola de sincronización).

## Documentación

- **[docs/ANALISIS-Y-ARQUITECTURA.md](docs/ANALISIS-Y-ARQUITECTURA.md)** — análisis del formulario fuente,
  ambigüedades detectadas y su resolución, arquitectura, modelo de datos y flujo de usuario. Léelo primero
  si vas a modificar la lógica de negocio.
- **[docs/manual_usuario.md](docs/manual_usuario.md)** — guía para el inspector de campo.
- **[docs/manual_tecnico.md](docs/manual_tecnico.md)** — arquitectura técnica, API HTTP, modelo de datos.
- **[docs/erd.md](docs/erd.md)** — diagrama entidad-relación.
- **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)** — instrucciones completas de despliegue en internet.

## Stack técnico

Node.js puro (`node:http`, sin framework) + TypeScript + SQLite nativo (`node:sqlite`) para la
demostración, con un modelo de datos PostgreSQL/Prisma ya preparado como objetivo de producción
(`prisma/schema.prisma`). Frontend HTML/JS vanilla + Tailwind (compilado, sin CDN) + PWA con Service
Worker y cola de sincronización offline en IndexedDB. Informes en PDF con `pdfkit`. Ver
[docs/ANALISIS-Y-ARQUITECTURA.md](docs/ANALISIS-Y-ARQUITECTURA.md) para la justificación de estas
decisiones (toma como referencia arquitectónica el proyecto `wabim-bridges`).

## Cómo ejecutar en desarrollo

Requiere **Node.js 22.5 o superior** (por `node:sqlite`).

```bash
npm install        # instala dependencias (tsx, typescript, tailwindcss, pdfkit)
npm run build:css  # compila public/styles.css a partir de public/tailwind.input.css
npm run seed       # crea data/edificaciones.sqlite y carga inspecciones de ejemplo
npm run dev        # inicia el servidor en http://localhost:4100
```

Abre `http://localhost:4100` — no hay pantalla de login, entras directo al panel.

### Pruebas

```bash
npm test
```

Pruebas unitarias del motor de sugerencia de clasificación de habitabilidad
(`src/domain/classification.ts`) — puro, sin base de datos ni servidor.

## Despliegue en internet

Ver **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)** para instrucciones completas (Render.com listo con
[`render.yaml`](render.yaml), variables de entorno, dominio, HTTPS, y notas sobre persistencia de datos y
fotografías).

## Estructura del proyecto

```
src/domain/           Catálogos cerrados del formulario + motor de sugerencia de clasificación —
                       SIN dependencias de framework/BD (portable a cualquier arquitectura)
  types.ts               Tipos de dominio
  catalog.ts              Catálogos (amenazas, usos, sistemas, elementos, recomendaciones)
  classification.ts        Motor de sugerencia de habitabilidad/nivel de daño
  classification.test.ts    Pruebas unitarias

src/db/                Capa de persistencia (SQLite nativo, demo)
  schema.sql, db.ts, queries.ts, seed.ts

src/server/             Servidor HTTP (Node puro) + API + generación de PDF/CSV
  server.ts, reportPdf.ts, reportPdfOficial.ts, reportCsv.ts
  auth.ts                  Sin usar hoy (sin login) — base para control de acceso futuro

public/                 Frontend vanilla (HTML/CSS/JS) + PWA
  index.html               Panel / dashboard (página de entrada, sin login)
  inspections.html          Listado de inspecciones
  inspection.html            Wizard de 8 pasos (cubre las 16 secciones del formulario + víctimas)
  app.js, offline.js, colombia.js, pathology-guide.js
  manifest.json, sw.js       PWA
  assets/logos/               Logos institucionales (formulario oficial + UTP)

prisma/schema.prisma    Modelo de datos objetivo (PostgreSQL + Prisma)
sql/postgresql_schema.sql  DDL PostgreSQL equivalente, legible sin Prisma

docs/                   Análisis, manuales, ERD, guía de despliegue
```

## Fuente

*Formulario Regional para Evaluación Rápida de Daños en Edificaciones*, V.1.0 - 03/2023, Sistema Nacional
de Gestión del Riesgo de Desastres (Colombia). Ver la nota sobre créditos institucionales en
[docs/ANALISIS-Y-ARQUITECTURA.md](docs/ANALISIS-Y-ARQUITECTURA.md).
