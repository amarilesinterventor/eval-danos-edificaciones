# Análisis y arquitectura propuesta — Herramienta de Evaluación Rápida de Daños en Edificaciones

Documento interno de Fase 1 (análisis) requerido antes de escribir código. Cubre: estructura completa
del formulario fuente, hallazgos de `wabim-bridges`, ambigüedades detectadas, arquitectura propuesta,
modelo de datos, flujo de usuario y estructura de carpetas.

## 1. Fuente: "Formulario Regional para Evaluación Rápida de Daños en Edificaciones" (V.1.0 - 03/2023)

Formulario de 2 páginas, tipo ATC-20 (evaluación visual rápida post-evento), del **Sistema Nacional de
Gestión del Riesgo de Desastres** (Colombia) con apoyo de **USAID** y **Miyamoto International**. 16
secciones numeradas. Transcripción completa por sección:

| # | Sección | Campos |
|---|---------|--------|
| 1 | Identificación de la evaluación | No. formulario, ID Zona, Nombre evaluador, Fecha, Hora (am/pm), ID Grupo, Entidad, **Tipo de amenaza** (8 opciones: avenida torrencial, erupción volcánica, incendio estructural, inundación, movimiento en masa, sismo, vendaval, otro), Persona de contacto, Núm. contacto |
| 2 | Clasificación de habitabilidad y nivel de daño | Tipo de inspección (Exterior solamente / Completa), **Habitabilidad**: Habitable🟢 / Uso restringido🟡 / No habitable🔴, **Nivel de daño**: Ninguno-Menor / Moderado / Severo |
| 3 | Información general | Departamento, Municipio, Barrio/Vereda, Urbano/Rural, Longitud WGS84, Latitud WGS84 |
| 4 | Identificación de la edificación | Dirección, Nombre, **Uso** (11 opciones: residencial, comercial, educacional, salud, hotelero, oficinas, institucional, industrial, bodegas, estacionamientos, otro), Núm. pisos sobre el suelo, Núm. sótanos, Tipo (Pública/Privada), Dimensiones aprox. (frente/fondo, m) |
| 5 | Sistema estructural, entrepiso y cubierta | 5.1 Sistema estructural (concreto/mampostería/acero/madera/bahareque-tapia/otros, 16 opciones); 5.2 Sistema de entrepiso (9 opciones); 5.3 Sistema de soporte de cubierta (7 opciones); 5.4 Tipo de cubierta (5 opciones) |
| 6 | Condiciones preexistentes y de entorno | 6.1 Morfología del sitio (7 opciones); 6.2 Amenaza por cuerpos hídricos (Sí/No + distancia + observaciones); 6.3–6.5 **solo si la evaluación es por sismo**: piso débil, columna corta, cambios drásticos de rigidez |
| 7 | Peligro global | Colapso total (Sí🔴/No), Colapso parcial (Sí🟡/No/No es claro), Inclinación evidente (Sí🔴/No), Riesgo por edificaciones adyacentes (Sí🟡/No/No es claro) |
| 8 | Peligro por condiciones geotécnicas | Licuación/asentamiento/subsidencia (Sí🔴/No), Movimientos en masa cercanos (Sí🔴/No) |
| 9 | Peligro por daño en elementos estructurales | Columnas, Muros portantes, Nodos/puntos de conexión, Riostras, Vigas, Entrepiso — cada uno con severidad N/L (Ninguno/Leve) · M (Moderado) · S (Severo) |
| 10 | Peligro por daño en elementos no estructurales | Muros de fachada/antepechos, Muros divisorios, Ventanales/vidrios de fachada, Cielo raso/luminarias, Cubiertas, Escaleras, Ascensores, Balcones, Tanques elevados, Instalaciones de gas, Instalaciones eléctricas, Acueducto y alcantarillado, Otros — misma escala N/L·M·S |
| 11 | Esquema | Planta y Elevación (papel cuadriculado, dibujo a mano) |
| 12 | Clasificación de habitabilidad y del daño | Repite los mismos campos de la sección 2 (misma clasificación, no es un segundo estado) + ¿Existe evaluación previa? (Sí/No, tipo, entidad, clasificación previa, fecha) |
| 13 | Ocupación de la edificación | Ocupada / Desocupada |
| 14 | Recomendaciones y medidas de seguridad | Evaluación adicional (estructural/geotécnica/empresa de servicios), evacuar edificación/edificaciones aledañas, desconectar energía/agua/gas, apuntalar, demoler elementos en peligro de caer, restringir paso peatonal/vehicular, estabilizar taludes, drenar agua, limpiar material acumulado en cubierta, cambiar teja/material de cubierta, otro |
| 15 | Comentarios finales | Texto libre |
| 16 | Información del evaluador | Nombre, ID evaluador, Tipo doc. (C.C./Pasaporte), Núm. documento, Entidad, Dependencia, Firma + Funcionario responsable (C.C., Entidad) |

**Semaforización existente**: la escala N/L · M · S se pinta en el formulario impreso con un patrón de
color por fila que refleja la criticidad estructural del elemento, no solo su severidad:

- **Elementos críticos de estabilidad global** (Columnas, Muros portantes, Nodos, Riostras): N/L=verde,
  M=**rojo**, S=**rojo** → cualquier daño moderado o severo en estos ya se trata como alarma roja.
- **Elementos con más margen** (Vigas, Entrepiso): N/L=verde, M=**amarillo**, S=**amarillo**.
- Sección 10 (no estructurales): se detectó visualmente el mismo patrón verde/amarillo/amarillo en la
  mayoría de filas, pero la resolución de la imagen no permite confirmar con certeza fila por fila —
  ver ambigüedad A2 abajo.

## 2. Hallazgos de `wabim-bridges` (D:\Claude\wabim-bridges\wabim-bridges)

Nota de ubicación: esta carpeta **no está dentro de** `D:\Claude\Inspección Estructural`, vive en
`D:\Claude\wabim-bridges\wabim-bridges`. Se analizó igual, por instrucción explícita.

- **Arquitectura**: servidor Node.js puro (`node:http`, sin framework), TypeScript compilado con `tsc`
  ejecutado en desarrollo vía `tsx`. Cero dependencias de servidor salvo `pdfkit`. Frontend HTML/JS
  vanilla + Tailwind por CDN, sin paso de build. Base de datos `node:sqlite` (nativo de Node ≥22.5) como
  espejo funcional de un `prisma/schema.prisma` (PostgreSQL) ya preparado para producción.
- **Por qué así**: el entorno donde se construyó no tenía acceso a internet (no podía instalar Next.js,
  Prisma, Postgres). *Nuestro entorno actual sí tiene acceso a internet* (verificado: `npm ping` responde),
  lo que abre la puerta a un stack más "moderno" — ver decisión en §4.
- **Patrones reutilizables identificados**:
  - Router manual por regex sobre `node:http` con tabla de rutas (`addRoute`) — simple, cero dependencias, suficiente para esta app.
  - Auth por token HMAC-SHA256 propio (`node:crypto`), sin JWT externo — formato de claims compatible con JWT real si se migra.
  - Fotos: el cliente redimensiona a máx. 1600px / JPEG q=0.8 en un `<canvas>` antes de subir como data URL; el servidor decodifica y guarda en `/public/uploads/<subdir>/<uuid>.<ext>`. Límite de body de 15 MB.
  - Auto-siembra (`autoSeedIfEmpty`) para que el hosting gratuito sin disco persistente arranque funcional tras cada redeploy.
  - Reporte PDF con `pdfkit`: helpers reutilizables (`sectionTitle`, `keyValueGrid`, `barRow`, `photoThumbRow`, paginación con footer numerado).
  - Frontend: `app.js` centraliza fetch autenticado (`api()`), helpers de UI (`escapeHtml`, modales, `selectWithOther` para catálogos cerrados + "Otro"), badges de color por clasificación.
  - Trazabilidad: los resultados de cálculo se "congelan" (snapshot) en cada registro en el momento de calcular, para que cambios futuros en catálogos no alteren inspecciones ya cerradas.
- **Lo que NO aplica a esta app**: el motor matemático WABIM (Ecs. 1–5, coeficientes I.C./E.C./C.E.C.,
  ponderación por densidad de daño) es específico de la metodología de puentes y no está en el formulario
  de edificaciones, que es un **checklist de severidad por elemento con semáforo**, no un índice
  ponderado. No se traslada ese motor de cálculo; si se traslada la *forma* de tener un módulo de dominio
  puro y auditable, aquí será el "motor de clasificación de habitabilidad" (§5).
- **Lo que sí se añade aquí y wabim-bridges no tiene** (su propio roadmap lo admite pendiente): PWA real
  con service worker y cola offline en IndexedDB — crítico para inspección de campo sin conectividad
  (pedido explícito del usuario, §16 y §24 del prompt).

## 3. Ambigüedades detectadas en el formulario (documentadas, no resueltas por invención)

- **A1 — Relación entre habitabilidad (sección 2/12) y los checklists de peligro (7, 8, 9, 10)**: el
  formulario no da una fórmula explícita que derive el semáforo final a partir de las casillas de
  peligro; en metodologías tipo ATC-20 esta es una decisión de juicio del inspector, informada por (no
  mecánicamente calculada de) los indicadores. **Resolución adoptada**: se implementa un motor de
  *sugerencia* (no vinculante) que propone Rojo si hay colapso total, inclinación evidente, licuación/
  asentamiento, movimientos en masa cercanos, o severidad "S" en un elemento estructural crítico; propone
  Amarillo si hay colapso parcial, riesgo por edificaciones adyacentes, severidad "M" en elemento crítico,
  o "S" en cualquier no-crítico; Verde en otro caso. El inspector ve la sugerencia resaltada pero **el
  valor final siempre es el que él seleccione** — igual que el proceso real de un inspector ATC-20.
- **A2 — Colores exactos por fila en la sección 10 (no estructurales)**: no se pudo confirmar con
  certeza absoluta el patrón de color de cada una de las 12 filas a partir de la imagen. Se adoptó un
  esquema uniforme (verde/amarillo/amarillo) para todas, consistente con que ninguna de ellas compromete
  la estabilidad global. **Recomendación**: que un ingeniero estructural del equipo valide esta
  asignación contra el formulario impreso original antes de un uso regulatorio; el código deja esto en
  un único archivo de catálogo (`elements.ts`) fácil de ajustar fila por fila.
- **A3 — Secciones 2 y 12 parecen duplicadas**: se interpretan como el **mismo dato** mostrado dos veces
  en el papel (una vez arriba, visible como carátula/placard; otra vez junto a las recomendaciones), no
  como "clasificación inicial" vs. "clasificación final". Se modela como un solo campo, editable desde
  cualquiera de las dos pantallas del wizard donde aparece.
- **A4 — Registro de daños "enriquecido" (fotos, descripción libre) pedido en el prompt (secciones 8–11
  del prompt del usuario) vs. el formulario original**: el formulario fuente **no** tiene una grilla de
  "daño individual con foto y descripción" — solo checkboxes de severidad N/L/M/S por elemento genérico,
  más el esquema de planta/elevación a mano y comentarios finales. El prompt del usuario sí pide
  explícitamente esa funcionalidad más rica. **Resolución**: se implementa como una **extensión aditiva**
  — no reemplaza ni contradice ninguna casilla oficial — que cuelga de los mismos elementos ya definidos
  por el formulario (Columnas, Muros portantes, Fachada, etc.): al marcar M o S en un elemento, el
  inspector puede (opcionalmente) adjuntar fotos y una nota de ubicación/descripción a ese elemento
  concreto. Esto es justificable como "necesidad evidente del proceso" (registro fotográfico, exigido
  explícitamente en el prompt) sin inventar categorías de daño nuevas.
- **A5 — Morfología del sitio (6.1) y Uso de la edificación (4)**: el formulario dibuja checkboxes
  cuadrados individuales (no radio buttons), lo que técnicamente permitiría multi-selección. Para
  "Uso de la edificación" se preserva multi-selección (un edificio puede ser mixto, p.ej. comercial +
  residencial). Para "Morfología del sitio" se interpreta como selección única (una edificación está en
  un solo tipo de terreno dominante), con opción "Otro".
- **A6 — Víctimas y afectación humana**: no está en el formulario impreso original (ninguna de las 16
  secciones registra muertos/heridos/desaparecidos/damnificados). Se agregó a solicitud explícita del
  usuario tras la primera entrega. **Resolución**: extensión aditiva junto a la sección 1
  (Identificación), por ser información que se levanta en el mismo momento inicial de la inspección;
  cuatro campos numéricos opcionales + observaciones, sin inventar una clasificación de severidad de
  víctimas (el formulario fuente no define una, y no es competencia de esta herramienta proponerla).

## 4. Decisión de arquitectura

Se mantiene la arquitectura de `wabim-bridges` (Node nativo + TypeScript + SQLite + frontend vanilla),
por instrucción explícita de tomarla como referencia y por ser la opción más rápida de construir y
desplegar sin fricción, **con dos añadidos importantes** que sí aprovechan que este entorno tiene
internet:

1. **PWA real** (manifest + service worker + cola offline en IndexedDB) — no existía en wabim-bridges.
2. **CSS compilado** (Tailwind CLI, ejecutado una vez como paso de build) en lugar de CDN — un service
   worker que depende de un script de terceros por CDN no puede garantizar carga offline; se compila un
   único `styles.css` autocontenido que el SW cachea.

El motor de cálculo WABIM no aplica aquí; su equivalente en esta app es un módulo de dominio puro
(`src/domain/`) con los catálogos cerrados del formulario y el motor de sugerencia de clasificación
(§3, A1), igual de testeable y sin dependencias de framework.

Ruta de migración a producción "seria" (Next.js/NestJS + PostgreSQL + Prisma) documentada en el README,
igual que en wabim-bridges: el esquema `prisma/schema.prisma` ya se entrega desde el día 1 como modelo
objetivo, y `src/domain/*` es portable sin cambios.

### Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js ≥ 22.5 (usa `node:sqlite` nativo) |
| Lenguaje | TypeScript |
| Servidor HTTP | `node:http` nativo + router propio (patrón wabim-bridges) |
| Base de datos (demo) | SQLite vía `node:sqlite` |
| Modelo objetivo (producción) | PostgreSQL + Prisma (`prisma/schema.prisma` incluido) |
| Frontend | HTML + JS vanilla + Tailwind (compilado, no CDN) |
| PDF / CSV | `pdfkit` / generador CSV propio |
| Auth | Ninguna (decisión explícita, §8) — `src/server/auth.ts` queda sin usar, como base para el futuro |
| PWA | `manifest.json` + Service Worker (cache-first app shell) + cola de sincronización en IndexedDB |
| Fotos | Redimensionado en cliente (canvas, máx. 1600px, JPEG q=0.8) → `/uploads` en disco |
| Despliegue | `render.yaml` (Render.com, igual que wabim-bridges) + documentación de alternativas |

## 5. Modelo de datos (resumen — ver `prisma/schema.prisma` para el detalle completo)

- `users` — tabla presente (mismo patrón que wabim-bridges) pero **sin usarse hoy**: la herramienta no
  tiene login (§8). Queda como base de escalabilidad futura.
- `inspections` — tabla ancha con el grueso de los campos de valor único del formulario (identificación,
  víctimas y afectación humana (A6), ubicación, edificación, condiciones, peligros globales/geotécnicos,
  clasificación, ocupación, evaluación previa, comentarios, datos del evaluador, estado y auditoría).
- Tablas hijas para los grupos de selección múltiple / repetibles:
  `inspection_threat_types`, `inspection_building_uses`, `inspection_structural_systems`,
  `inspection_floor_systems`, `inspection_roof_support_systems`, `inspection_roof_types`,
  `inspection_element_damages` (sección 9+10: elemento, categoría estructural/no-estructural, severidad),
  `inspection_safety_recommendations` (sección 14).
- `damage_records` — la extensión aditiva de A4: daño individual con foto, ligado opcionalmente a un
  `inspection_element_damages`.
- `photos` — ligadas a inspección (panorámica/esquema/firma) o a un `damage_record`.
- Catálogos (amenazas, usos, sistemas, elementos, recomendaciones) **no** se guardan en BD: viven como
  datos estáticos versionados en código (`src/domain/catalog.ts`), porque a diferencia de WABIM no hay
  coeficientes numéricos que un administrador deba recalibrar — son listas cerradas del formulario oficial.

## 6. Flujo de usuario (wizard de 8 pasos, cubre las 16 secciones)

1. **Identificación** — sección 1 (+ tipo de amenaza) + víctimas y afectación humana (A6)
2. **Ubicación** — sección 3 (GPS automático + corrección manual)
3. **Edificación** — secciones 4 + 5 (sistema estructural/entrepiso/cubierta)
4. **Condiciones y peligros** — secciones 6 + 7 + 8
5. **Daños en elementos** — secciones 9 + 10, con guía visual de patologías por elemento (§8) y fotos
   opcionales por elemento marcado M/S (extensión A4)
6. **Esquema y clasificación** — sección 11 (foto del esquema a mano) + clasificación sugerida/editable (secciones 2/12 unificadas, A3)
7. **Recomendaciones** — sección 13 (ocupación) + 14 (recomendaciones, con sugerencias automáticas editables) + evaluación previa
8. **Finalizar** — sección 15 (comentarios) + 16 (evaluador) + pantalla "Resumen de la inspección"
   (completitud, # daños, # fotos, clasificación) + Generar informe PDF/CSV. El botón "Finalizar →" del
   pie de página guarda, marca la inspección como FINALIZADA y regresa al panel.

Panel inicial con conteos por estado, últimas inspecciones y accesos directos. Listado de inspecciones
con estado (Nueva/En proceso/Finalizada/Informe generado) y acciones Abrir/Continuar/Finalizar/Generar
informe. Guardado incremental en cada paso (PATCH por sección) + cola offline si no hay red. **Sin
login**: no hay pantalla de entrada previa al panel — ver §8.

## 7. Estructura de carpetas

```
Inspección Estructural/
  2A-Formulario regional homogenizado.pdf   (fuente del formulario)
  guia-patologias.pdf                       (fuente de referencia — FOPAE-AIS 2011, ver §8)
  docs/
    ANALISIS-Y-ARQUITECTURA.md              (este documento)
    manual_usuario.md
    manual_tecnico.md
    erd.md
    DESPLIEGUE.md
  src/
    domain/            catalog.ts, classification.ts, types.ts — puro, sin deps de framework
    db/                 schema.sql, db.ts, queries.ts, seed.ts
    server/              server.ts, reportPdf.ts, reportCsv.ts, auth.ts (sin usar hoy)
  public/
    index.html            panel (página de entrada, sin login)
    inspections.html       listado
    inspection.html         wizard de 8 pasos
    app.js, offline.js, colombia.js, pathology-guide.js
    styles.css (compilado), tailwind.input.css
    manifest.json, sw.js
    assets/logos/            logos institucionales (formulario oficial + UTP + Unilibre)
  prisma/schema.prisma
  sql/postgresql_schema.sql
  render.yaml
  package.json, tsconfig.json
```

## 8. Cambios posteriores a la entrega inicial (feedback del usuario)

Tras la primera entrega, el usuario (identificado como Ing. Cristhian Camilo Amariles López, autor
también del artículo WABIM citado en `wabim-bridges`) pidió los siguientes ajustes:

- **Quitar el login**: la app original incluía cuentas de ejemplo (patrón heredado de wabim-bridges). Se
  eliminó por completo — `login.html` ya no existe, ninguna ruta de la API exige autenticación, y el
  inspector entra directo al panel. `src/server/auth.ts` y la tabla `users` quedan en el código sin
  usarse, documentados como base para activar control de acceso si el proyecto crece a
  multi-inspector/administrador (§ Escalabilidad futura del encargo original).
- **Víctimas y afectación humana**: ver ambigüedad A6 arriba.
- **Reversión de la decisión sobre logos institucionales**: la primera entrega decidió, por precaución,
  **no** reproducir los logos oficiales del formulario (Sistema Nacional de Gestión del Riesgo de
  Desastres, USAID, Miyamoto International) ni los sellos de las gobernaciones/alcaldías del Eje
  Cafetero, para evitar que un informe generado por una herramienta independiente pareciera un documento
  oficial. El usuario —autor de la herramienta y con contexto profesional/académico directo sobre ese
  mismo formulario regional— pidió explícitamente incluirlos, junto con su propio nombre como autor y los
  logos de sus instituciones (UTP, Universidad Libre). Se revirtió la decisión: los tres logos y la franja
  de sellos regionales se extrajeron directamente del PDF fuente (`2A-Formulario regional
  homogenizado.pdf`, que el propio usuario proporcionó para construir exactamente esta réplica digital) y
  se reproducen en el mismo lugar que ocupan en el formulario impreso, tanto en el informe PDF como en el
  pie de página de la app. La sección de "Créditos" (autoría de la herramienta) se mantiene visualmente
  separada de los logos oficiales para no sugerir que UTP/Unilibre son coautoras del formulario, ni que la
  herramienta es un producto oficial de las entidades citadas — ver la nota completa en
  `src/server/reportPdf.ts`.
- **Guía visual de patologías**: diagramas SVG originales por elemento estructural (ver §7 del manual
  técnico), organizados según la *Guía de Patologías Constructivas, Estructurales y No Estructurales*
  (FOPAE-AIS, 2011) que el usuario aportó como `guia-patologias.pdf` — se cita como referencia conceptual,
  no se reproduce ninguna figura ni texto de ese documento (114 páginas, publicación de la Alcaldía Mayor
  de Bogotá / Asociación Colombiana de Ingeniería Sísmica).
- **Diseño del informe PDF**: rediseñado para reflejar la estructura visual del formulario impreso
  (encabezado con los mismos logos, numeración de secciones idéntica, mismo semáforo de colores, franja
  de sellos regionales en el pie de página de cada hoja) más una portada propia con foto de la edificación
  y clasificación, no presente en el formulario original.
- **Corrección de error**: el botón "Finalizar →" del pie de página en el paso 8 del wizard no tenía
  ninguna acción asociada (bug real, confirmado en el código). Ahora guarda la inspección, la marca como
  FINALIZADA y redirige al panel.

## 9. Tercera ronda de feedback

- **Contraste de las opciones seleccionables**: los chips/casillas (checkboxGroup, chipRadio,
  severityChips) usaban borde claro + fondo pastel para el estado seleccionado, poco visibles a la luz
  del sol en campo. Se cambió a relleno sólido (color de marca o de severidad) + texto blanco cuando está
  seleccionada, y borde marcado (`border-2 border-slate-400`) + texto oscuro cuando no — ver
  `public/app.js`, constantes `OPTION_IDLE_CLS`/`OPTION_ACTIVE_CLS`.
- **Nombre de la herramienta**: cambiado de "Formulario Regional para Evaluación Rápida de Daños en
  Edificaciones" a **"Herramienta de Evaluación Rápida de Daños en Edificaciones"** en toda la identidad
  propia de la app (pestañas del navegador, barra de navegación, `manifest.json`, este documento, README).
  **Interpretación aplicada** (no confirmada explícitamente por el usuario, documentada para que pueda
  corregirse si no era la intención): el encabezado del informe PDF/CSV, que replica el formulario oficial
  impreso, conserva el título literal de ese formulario ("Formulario Regional...") porque cambiar ese
  texto rompería la instrucción previa de "conservar el diseño original" — el nombre de la herramienta ya
  aparece en la sección de Créditos del propio informe. Si el usuario prefiere que el título del informe
  también cambie, es un ajuste de una línea en `src/server/reportPdf.ts`.
- **5.4 Tipo de cubierta — falta "Otro"**: el catálogo `ROOF_TYPES` no tenía opción "Otro" pese a que el
  formulario impreso sí la contempla implícitamente (todas las demás listas de la sección 5 la tienen).
  Se agregó, junto con la columna `other_text` en `inspection_roof_types` (antes esa tabla solo guardaba
  el código, a diferencia de todas las demás tablas de grupos multi-selección).
- **Flujo de fotos en "Detalle con foto"**: antes había que guardar el daño primero para poder adjuntar
  fotos (la foto se subía de inmediato contra un `damageRecordId` que aún no existía). Se rediseñó para
  que las fotos elegidas/tomadas queden en memoria (pendientes) hasta que el inspector presiona "Guardar
  daño", momento en el que se crea el registro y se suben todas las fotos pendientes en una sola acción;
  el modal se cierra automáticamente al terminar.
- **Selector visual de tipo de daño**: la guía de patologías (§8 anterior), antes solo de consulta, ahora
  también funciona como selector — dentro del modal "Detalle con foto", el campo "Tipo de daño" se llena
  con un clic sobre el esquema correspondiente (más una tarjeta "Otro" para texto libre), reutilizando el
  mismo `guideModal` en un modo seleccionable.
- **Corrección de error**: un daño recién guardado no aparecía en la lista del paso 5 hasta que el
  inspector volvía a tocar el chip de severidad. Causa raíz: el flujo de guardar/cerrar el modal de daño
  nunca volvía a renderizar el contenedor del paso 5 (solo se refrescaba el estado en memoria vía
  `loadAll()`, no el DOM). Se corrigió llamando `renderStep5(container)` al cerrar el modal.

## 10. Cuarta ronda de feedback

- **PDF en el formato oficial exacto ("2A - Formulario regional homogenizado")**: el usuario pidió una
  segunda opción de informe que reproduzca el formato oficial exacto, diligenciado con los datos de la
  inspección, para el caso en que el organismo de atención de desastres exija su propio formato — y que el
  inspector pueda generar **ambos** tipos de informe (el rediseñado y el oficial), no uno en vez del otro.
  - **Decisión de implementación** (la más relevante de esta ronda, documentada en detalle porque cambió de
    enfoque a mitad de la investigación): la primera aproximación fue extraer las coordenadas exactas de
    cada una de las ~169 casillas del PDF fuente (dos páginas) mediante un script Python/PyMuPDF que agrupa
    segmentos de línea por proximidad de esquina (unión-búsqueda) — detectó 104 casillas en la página 1 y
    65 en la página 2, más 28+23 campos de texto subrayados. El plan era superponer marcas de verificación
    sobre una imagen rasterizada de esas páginas originales. Se abandonó ese enfoque porque: (a) la fuente
    del PDF fuente usa un cmap no estándar/cifrado — el texto que se extrae programáticamente sale
    ilegible (mismo hallazgo que al leer el PDF por primera vez al inicio del proyecto) — así que
    emparejar cada casilla detectada con su campo real solo podía hacerse leyendo capturas anotadas con
    números a mano, con riesgo real de marcar la casilla equivocada en un documento que puede terminar en
    manos de una entidad de atención de desastres; y (b) aunque ese emparejamiento se hubiera completado,
    superponer sobre una imagen de fondo separa la coordenada de la casilla (fija, del PDF original) de la
    coordenada de la marca de verificación (calculada aparte), lo que deja una puerta abierta a
    desalineación silenciosa. En su lugar, `src/server/reportPdfOficial.ts` **redibuja el formulario en
    vectores**: mismas 16 secciones, mismo orden, mismas opciones textuales exactas (tomadas de la
    transcripción de §1 de este documento y de `src/domain/catalog.ts`, ambas ya derivadas del formulario
    original), mismo patrón de semaforización de colores (verde/amarillo/rojo pre-impresos en las casillas
    "buenas"/"malas" de habitabilidad, peligro global/geotécnico y severidad N/L·M·S). Como la misma
    llamada de código calcula la posición de la casilla y la de su marca de verificación (ver
    `layoutOptions`/`drawOptions`), la desalineación queda eliminada por construcción en vez de mitigada.
    El resultado en tamaño Carta (612x792pt, igual al original) ocupa 2-3 páginas según cuánta información
    tenga la inspección.
  - Tamaño de página confirmado como Carta (no A4, a diferencia del informe rediseñado que usa A4) al
    renderizar el PDF fuente: 612x792pt.
  - El paso 8 ahora ofrece tres acciones independientes: **"📄 Generar informe PDF"** (el rediseñado, con
    portada/fotos/créditos), **"📋 Generar formato oficial (PDF)"** (la réplica exacta diligenciada) y
    **"⬇ Exportar datos (CSV)"** — ver `GET /api/inspections/:id/report-oficial.pdf` en
    `src/server/server.ts`.
  - Validado generando el PDF oficial para tres casos: una inspección con datos completos (159KB, todas
    las secciones diligenciadas, incluida la lógica condicional de 6.3-6.5 que solo aparece si se marcó
    "Sismo"), una parcial y un borrador casi vacío (todos los campos en "—", sin checkboxes marcados) — las
    tres se generan sin errores y sin recuadros de texto que se salgan de su caja.
- **Créditos de la Universidad Libre**: el usuario pidió quitar el logo y los créditos de esa institución,
  conservando el nombre del autor y el logo/crédito de la UTP. Se quitó de `src/server/reportPdf.ts`
  (sección "Créditos" del informe PDF) y de `renderFooter()` en `public/app.js` (pie de página web). El
  archivo de imagen `public/assets/logos/unilibre-pereira.png` se dejó en disco sin usar (este proyecto no
  tiene control de versiones, así que borrar el archivo habría sido una acción irreversible sin beneficio
  real) pero se retiró de la lista de precarga del service worker (`SHELL_ASSETS` en `public/sw.js`).
- **Guía visual de patologías para elementos no estructurales (sección 10)**: el selector visual de tipo de
  daño (§9 anterior) solo tenía diagramas para los 6 elementos estructurales; los 12 elementos no
  estructurales usaban `NON_STRUCTURAL_FAILURE_MODES`, una sola línea de texto sin diagramas ni selección
  por clic. Se agregaron 2-3 diagramas SVG originales por elemento (28 en total) a
  `PATHOLOGY_GUIDE` en `public/pathology-guide.js`, con el mismo estilo de dibujo de línea que ya usaban
  los elementos estructurales (gris para la silueta intacta, rojo para el daño), y se retiró
  `NON_STRUCTURAL_FAILURE_MODES` por quedar redundante. No hizo falta tocar `inspection.html`:
  `openGuideModal()` ya buscaba primero en `PATHOLOGY_GUIDE` y solo caía al modo de texto plano si no había
  entrada — al agregar las entradas, la selección por clic (incluida la tarjeta "Otro") quedó habilitada
  automáticamente para los 12 elementos, confirmado en el navegador contra una inspección real. Los
  mecanismos de falla ilustrados (volcamiento, fisuras diagonales, caída, desalineación, ruptura de
  tuberías, etc.) se organizaron consultando la *Guía de Patologías Constructivas, Estructurales y No
  Estructurales* (FOPAE-AIS, 2011) — en particular su capítulo 4.3 sobre modos de falla de elementos no
  estructurales y sus anexos de catálogo de patologías en muros no estructurales y en otros materiales —
  pero los dibujos son ilustraciones propias, no reproducciones de las figuras de esa guía (mismo criterio
  de autoría ya aplicado a los diagramas estructurales).

## 11. Despliegue en producción y quinta ronda de feedback

- **Despliegue**: la app se llevó a internet siguiendo el mismo procedimiento que `wabim-bridges` —
  `git init` (este proyecto no tenía control de versiones hasta ahora), commit inicial, repositorio
  público en `github.com/amarilesinterventor/eval-danos-edificaciones`, y despliegue en Render (nivel
  gratis) vía Blueprint (`render.yaml`, ya preparado desde la entrega inicial). URL en producción:
  **https://eval-danos-edificaciones.onrender.com**. Antes del primer commit se revisó cuidadosamente qué
  no debía subirse a un repositorio público: los datos reales de prueba (`data/edificaciones.sqlite`,
  `public/uploads/*`) ya estaban en `.gitignore` desde la entrega inicial; se agregaron además los dos PDF
  de referencia sueltos en la raíz del proyecto (el formulario fuente y la guía de patologías, esta última
  con derechos de autor de terceros) — ver más abajo por qué el formulario fuente tuvo que revertirse
  parcialmente de esa exclusión.
- **PDF "formato oficial": de réplica en vectores a superposición exacta sobre el PDF fuente.** La cuarta
  ronda (§10) había resuelto generar el formato oficial *redibujando* el formulario en vectores, para no
  arriesgarse a superponer marcas sobre una imagen del PDF original sin haber podido verificar con
  certeza la posición de cada casilla (el texto del PDF fuente es ilegible por su cmap no estándar). El
  usuario pidió explícitamente algo más estricto: **"exactamente el mismo formato PDF... la misma
  distribución y exactamente los mismos campos, los mismos colores"** — es decir, no una réplica fiel sino
  el documento oficial literal, diligenciado. Esto obligó a resolver el problema que la cuarta ronda había
  evitado: mapear con certeza la coordenada de cada casilla del PDF fuente. Se logró así (documentado en
  detalle porque es el trabajo más delicado de todo el proyecto — un error aquí significa marcar la
  casilla equivocada en un documento oficial):
  1. **Detección geométrica de casillas, no por texto**: un script Python/PyMuPDF agrupa los segmentos de
     línea del PDF (independientes del texto, que es ilegible) que forman cada casilla — buscando, para
     cada segmento horizontal candidato a "borde superior", el segmento horizontal "borde inferior" a
     8-14pt de distancia con el mismo rango en X, y verificando que existan los dos segmentos verticales
     que los conectan. Este método (más robusto que un primer intento de unión-búsqueda por proximidad de
     esquina, que se enredaba con las ~450 líneas subrayadas del formulario y fusionaba grupos por
     coincidencia de coordenadas) encontró 108 casillas en la página 1 y 74 en la página 2, más 3 casillas
     de color de la sección 12 (rectángulos de relleno anchos, detectados por separado). 185 casillas en
     total, más 43 campos de texto (líneas subrayadas).
  2. **Verificación cruzada, no solo detección**: cada casilla se asignó a un campo del dominio (p.ej.
     `sev.COLUMNAS.M`, `use.RESIDENCIAL`) cruzando tres fuentes independientes — (a) la posición geométrica
     agrupada por fila/columna, (b) el orden exacto de las opciones en `src/domain/catalog.ts` (ya
     transcrito del formulario en la fase inicial del proyecto) y (c) capturas del formulario con cada
     casilla numerada y resaltada, generadas por el mismo script y leídas una por una — incluyendo recortes
     ampliados de zonas densas para evitar leer mal un número pequeño. Cuando el conteo de casillas
     encontradas en una sección no coincidía con el número de opciones del catálogo (p.ej. sección 14 solo
     traía 8 de 17), se investigó la causa en vez de asumir que sobraban opciones — y en todos los casos la
     causa fue una casilla real que el detector geométrico aún no encontraba, nunca una opción de más.
  3. **Superposición con `pdf-lib`**: `src/server/reportPdfOficial.ts` ahora carga el PDF fuente real
     (`assets/official-form/2a-formulario-regional-homogenizado.pdf`) con `pdf-lib` y dibuja una X o el
     texto correspondiente en las coordenadas de `officialFormCoords.ts` (el mapa de 185+43 coordenadas
     verificado en el paso anterior). Detalle importante de coordenadas: el mapa se generó con PyMuPDF
     (origen arriba-izquierda, Y crece hacia abajo) pero `pdf-lib` dibuja en el espacio nativo del PDF
     (origen abajo-izquierda, Y crece hacia arriba) — cada Y se convierte con `alturaPágina - y` antes de
     dibujar. El resultado es, literalmente, el PDF oficial con los datos de la inspección encima — no una
     réplica — así que el formato, la distribución, los campos y los colores son exactamente los del
     documento original por construcción.
  4. **Corrección visual tras la primera prueba**: la X dibujada corner-a-corner en las 3 casillas de color
     de la sección 12 (rectángulos anchos, ~31x11pt, a diferencia de las demás casillas que son ~11x11pt)
     salía casi plana y difícil de leer. Se cambió `drawCheck()` para dibujar una X centrada y
     proporcional usando el lado más corto del rectángulo como base del tamaño, en vez de ir de esquina a
     esquina — legible sin importar la proporción de la casilla.
  5. **Validado** generando el PDF para una inspección completa (con overlay verificado visualmente campo
     por campo contra las dos páginas reales) y para un borrador vacío (ningún campo diligenciado, sin
     casillas marcadas, sin errores).
  - El PDF fuente pasó a ser un asset necesario en tiempo de ejecución (antes se excluía del repositorio
    por considerarse solo material de referencia): vive en `assets/official-form/`, sí se versiona (es un
    formulario gubernamental público, no una publicación con derechos reservados de terceros como la guía
    de patologías), y `scripts/copy-assets.mjs` lo copia a `dist/` igual que `schema.sql`.
- **Código QR para compartir la app**: se generó un QR (color de marca, corrección de errores nivel M)
  apuntando a la URL de producción, verificado decodificándolo de vuelta antes de usarlo. Vive en
  `public/assets/qr-app.png` y se agregó una tarjeta "Comparte esta herramienta con otros inspectores" en
  el Panel (`public/index.html`) con el QR, el enlace en texto (para quien no pueda escanear) y un botón
  de copiar — para que cualquier inspector que ya tenga la app abierta pueda mostrárselo a un colega y que
  este acceda desde su celular sin instalar nada ni crear cuenta.

## 12. APK Android (Capacitor) y corrección de un bug real en `loadAll()`

- **Motivación**: aun con la app instalada como PWA, el usuario reportó que en campo (tras un sismo, sin
  señal estable) necesitaba algo que no dependiera de haber abierto la app al menos una vez con conexión.
  Se evaluaron las opciones (reforzar el PWA, empaquetar con Capacitor, o reescritura nativa completa) y
  se descartó la reescritura nativa por desperdiciar todo el trabajo ya construido sin necesidad real —
  Capacitor reutiliza el 100% del código web sin tocarlo.
- **Proyecto separado**: `D:\Claude\eval-danos-edificaciones-apk`, fuera del repositorio web, por pedido
  explícito del usuario de no modificar la herramienta web. Un script (`scripts/sync-web-assets.mjs`) copia
  `public/` hacia `www/` de ese proyecto (excluyendo `uploads/`, fotos reales de pruebas) e inyecta un
  archivo nuevo (`native-shim.js`, solo existe ahí) como primer `<script>` de cada página. El APK empaqueta
  ese `www/` completo — la app funciona sin ninguna conexión desde el primer arranque, no solo después de
  una visita previa.
- **CORS sin tocar el servidor**: dentro del APK, la página vive en un origen local (`https://localhost`,
  servido por Capacitor) mientras la API sigue en `eval-danos-edificaciones.onrender.com` — un origen
  distinto. `native-shim.js` completa las rutas relativas `/api/...`/`/uploads/...` con ese origen real, y
  `capacitor.config.json` activa `plugins.CapacitorHttp.enabled`, que hace que Android enrute esas
  peticiones a través de networking **nativo** en vez del `fetch` del WebView — confirmado leyendo el
  código fuente de Capacitor (`Bridge.java`/`native-bridge.js`): las peticiones al propio origen local
  siguen sirviéndose sin cambios; solo las de otro origen se enrutan de forma nativa, evitando el bloqueo
  de CORS del navegador sin necesitar ninguna cabecera nueva en el servidor.
- **Compilación**: el entorno donde se generó el proyecto no tenía Android Studio ni un JDK compatible
  (solo Java 8) — se instalaron Android Studio y JDK 21 (Microsoft Build of OpenJDK) vía `winget`, con
  autorización del usuario. Detalle documentado en el README del proyecto APK: Gradle 8.14.3 exige JDK 21
  para compilar (`capacitor-android` compila contra "release 21"), y un demonio de Gradle que queda vivo de
  un intento anterior puede quedar con una resolución DNS en caché, causando errores confusos de "Unknown
  host" incluso con la red funcionando bien — se resuelve con `gradlew --stop` antes de cada build (ya
  automatizado en `scripts/build-apk.mjs`).
- **Bug real encontrado y corregido en `inspection.html`** (con autorización explícita del usuario para
  tocar el repo web, dado que es un bug genuino compartido con la web, no algo introducido por el
  empaquetado): `loadAll()` no tenía manejo de error alrededor de `catalog = await api("/catalog")` — a
  diferencia de la carga de la inspección, que sí lo tenía. Diagnosticado en campo con evidencia de log
  (`adb logcat` conectado al dispositivo real): una casilla de severidad se guardaba correctamente en el
  servidor (confirmado con la respuesta HTTP 200 de la API), pero el redibujado posterior mostraba datos
  viejos — con solo ~20ms entre la respuesta del guardado y el redibujado, tiempo insuficiente para que
  `loadAll()` hubiera completado sus dos llamadas de red reales, lo que apuntaba a que esa función fallaba
  y terminaba casi de inmediato. Como `goToStep()` y el manejador de clic de severidad llaman
  `await loadAll()` sin su propio try/catch, una falla ahí interrumpía en silencio la cadena
  guardar→recargar→redibujar, sin ningún aviso visible — explicando a la vez los tres síntomas reportados
  (severidad no se veía marcada, botón "+ Detalle con foto" no aparecía, fotos no se veían reflejadas: los
  tres dependen de ese mismo redibujado). Corrección: se envolvió también la carga del catálogo en su
  propio try/catch, con un `BLANK_CATALOG_STUB()` de respaldo (o la última copia buena, si ya había una) —
  `loadAll()` ahora nunca lanza, protegiendo los 7 sitios que la llaman sin manejo de error propio. Bump de
  `CACHE_VERSION` a `v9` en `public/sw.js` para que la PWA web también reciba la corrección.
  - Se descartaron dos hipótesis previas antes de encontrar esta: una caché de lecturas en `native-shim.js`
    que podía servir datos viejos (se quitó por peligrosa, aunque no era la causa raíz de este caso
    puntual) y un problema de repintado del WebView (se probó forzar reflow/composición tras cada
    redibujado — no tuvo efecto, confirmando que el problema era de datos, no de pintura).
