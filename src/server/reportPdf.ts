/**
 * Generación del informe PDF — replica la identidad visual del "Formulario
 * Regional para Evaluación Rápida de Daños en Edificaciones" (V.1.0 -
 * 03/2023): mismos logos institucionales, mismo título, mismas secciones
 * numeradas y el mismo semáforo de colores del formulario impreso original,
 * con una portada propia (foto de la edificación + clasificación) y un
 * bloque de créditos de la herramienta digital al final.
 *
 * Nota de marca: los logos del encabezado (Sistema Nacional de Gestión del
 * Riesgo de Desastres, USAID, Miyamoto International) y el pie de página
 * (gobernaciones y alcaldías del Eje Cafetero) se extrajeron directamente del
 * PDF fuente que el propio formulario oficial ya usa — se reproducen aquí
 * porque el objetivo explícito es una réplica digital fiel de ese formulario,
 * no una alteración fraudulenta ni una reclamación de que esta herramienta
 * sea el sistema oficial de esas entidades. El bloque de "Créditos" al final
 * (Ing. Cristhian Camilo Amariles López, UTP) identifica
 * claramente a la herramienta digital como una implementación independiente.
 *
 * Mismo enfoque de helpers reutilizables que
 * `wabim-bridges/src/server/reportPdf.ts` (pdfkit, dibujo de página directo).
 */
import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getInspection } from "../db/queries.js";
import {
  THREAT_TYPES,
  BUILDING_USES,
  STRUCTURAL_SYSTEMS,
  FLOOR_SYSTEMS,
  ROOF_SUPPORT_SYSTEMS,
  ROOF_TYPES,
  SITE_MORPHOLOGY,
  SAFETY_RECOMMENDATIONS,
  HABITABILITY_META,
  DAMAGE_LEVEL_META,
  getElementDef,
  severityBoxColor,
} from "../domain/catalog.js";
import type { CatalogOption } from "../domain/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "..", "public");
const LOGOS_DIR = join(PUBLIC_DIR, "assets", "logos");

const PAGE_MARGIN = 42;
const PAGE_WIDTH = 595.28; // A4 puntos
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const FOOTER_RESERVED = 46; // franja inferior reservada para el pie institucional

const BRAND_DARK = "#1e3a5f";
const BRAND_ACCENT = "#2563eb";

type Doc = PDFKit.PDFDocument;

const SEVERITY_LABEL: Record<string, string> = { NL: "Ninguno/Leve", M: "Moderado", S: "Severo" };
const TRISTATE_LABEL: Record<string, string> = { SI: "Sí", NO: "No", NO_ES_CLARO: "No es claro" };

function logoPath(name: string): string {
  return join(LOGOS_DIR, name);
}
function labelFor(list: CatalogOption[], code: string | null | undefined): string {
  if (!code) return "—";
  return list.find((o) => o.code === code)?.label ?? code;
}
function labelList(list: CatalogOption[], items: Array<{ code: string; otherText?: string }>): string {
  if (!items?.length) return "—";
  return items.map((it) => (it.code === "OTRO" && it.otherText ? `Otro: ${it.otherText}` : labelFor(list, it.code))).join(", ");
}
function fmtYesNo(v: string | null): string {
  return v == null ? "—" : (TRISTATE_LABEL[v] ?? v);
}
function fmtNum(n: unknown): string {
  return n == null || n === "" ? "0" : String(n);
}

/** Altura disponible antes de que empiece la franja del pie de página. */
function bottomLimit(doc: Doc): number {
  return doc.page.height - FOOTER_RESERVED;
}
function ensureSpace(doc: Doc, needed: number) {
  if (doc.y + needed > bottomLimit(doc)) doc.addPage();
}

// ---------------------------------------------------------------------------
// Encabezado — logos + título, igual disposición que el formulario impreso
// (SNGRD a la izquierda, USAID + Miyamoto a la derecha, título centrado).
// ---------------------------------------------------------------------------
function addFormHeader(doc: Doc) {
  const y = PAGE_MARGIN - 6;
  const logoH = 30;
  const sngrd = logoPath("sngrd.png");
  const usaidMiyamoto = logoPath("usaid_miyamoto.png");

  if (existsSync(sngrd)) {
    doc.image(sngrd, PAGE_MARGIN, y, { height: logoH });
  }
  if (existsSync(usaidMiyamoto)) {
    const w = logoH * (1040 / 272);
    doc.image(usaidMiyamoto, PAGE_MARGIN + CONTENT_WIDTH - w, y, { height: logoH });
  }

  // La altura del título se mide en vez de asumirse (heightOfString): con
  // este ancho el texto puede ajustarse a 2 o 3 líneas según la fuente
  // disponible en el sistema, y asumir un número fijo de líneas causaba que
  // la regla de abajo se dibujara encima del texto cuando envolvía a una
  // línea de más (bug detectado en la primera versión de este archivo).
  const titleX = PAGE_MARGIN + 108;
  const titleWidth = CONTENT_WIDTH - 216;
  const titleText = "FORMULARIO REGIONAL PARA EVALUACIÓN RÁPIDA DE DAÑOS EN EDIFICACIONES";
  doc.fontSize(10.5).font("Helvetica-Bold").fillColor(BRAND_DARK);
  const titleHeight = doc.heightOfString(titleText, { width: titleWidth, align: "center" });
  doc.text(titleText, titleX, y + 4, { width: titleWidth, align: "center" });

  doc.y = Math.max(y + 4 + titleHeight, y + logoH) + 6;
  doc.x = PAGE_MARGIN;
  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).lineWidth(1.2).strokeColor(BRAND_ACCENT).stroke();
  doc.moveDown(0.5);
  doc.x = PAGE_MARGIN;
  doc.fillColor("#0f172a");
}

/** Pie de página: sellos institucionales regionales (igual que el formulario impreso) + numeración. */
function addFooter(doc: Doc, formNumber: string | null | undefined, pageLabel: string) {
  const seals = logoPath("entidades_regionales.png");
  const y = doc.page.height - FOOTER_RESERVED + 6;
  const originalBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  if (existsSync(seals)) {
    const h = 15;
    const w = h * (824 / 152);
    try {
      doc.image(seals, PAGE_MARGIN, y, { height: h });
    } catch {
      // Un logo ilegible no debe romper el informe.
    }
  }
  doc.fontSize(7).fillColor("#94a3b8").text(
    `Número consecutivo: ${formNumber || "—"}   ·   Versión: V.1.0 - 03/2023   ·   ${pageLabel}`,
    PAGE_MARGIN,
    y + 20,
    { width: CONTENT_WIDTH, align: "center" },
  );
  doc.page.margins.bottom = originalBottomMargin;
}

// ---------------------------------------------------------------------------
// Encabezado de sección — barra de color con el número/título exacto del
// formulario impreso (sin caja de cierre: evita cortes inconsistentes cuando
// el contenido de la sección cruza a la página siguiente).
// ---------------------------------------------------------------------------
function sectionBanner(doc: Doc, title: string, subtitle?: string) {
  ensureSpace(doc, 40);
  doc.x = PAGE_MARGIN;
  doc.moveDown(0.4);
  const y = doc.y;
  const barH = 19;
  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, barH, 3).fill(BRAND_DARK);
  doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#ffffff").text(title.toUpperCase(), PAGE_MARGIN + 9, y + 5, { width: CONTENT_WIDTH - 18 });
  doc.y = y + barH + 7;
  doc.x = PAGE_MARGIN;
  if (subtitle) {
    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor("#94a3b8").text(subtitle, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.3);
    doc.x = PAGE_MARGIN;
  }
  doc.font("Helvetica").fillColor("#0f172a");
}

// Fila completa por iteración (ver nota en la versión anterior de este
// archivo): evita que una fila quede partida entre dos páginas con `doc.y`
// heredando una coordenada de la página vieja.
function keyValueGrid(doc: Doc, pairs: Array<[string, string]>, cols: 2 | 3 = 2) {
  const colWidth = CONTENT_WIDTH / cols;
  const cellWidth = colWidth - 10;
  const LABEL_SIZE = 7.5;
  const VALUE_SIZE = 9.5;
  const ROW_GAP = 7;

  // La altura de la etiqueta se mide sobre el texto real (no un carácter de
  // referencia): con 3 columnas una etiqueta larga como "¿HAY CAMBIOS
  // DRÁSTICOS DE RIGIDEZ?" puede envolver a 2 líneas, y asumir 1 sola línea
  // hacía que el valor se dibujara encima de la segunda línea de la etiqueta
  // (mismo tipo de bug que el título del encabezado — ver addFormHeader).
  function labelHeight(label: string): number {
    return doc.fontSize(LABEL_SIZE).heightOfString(label.toUpperCase(), { width: cellWidth });
  }
  function cellHeight(label: string, value: string): number {
    const valueH = doc.fontSize(VALUE_SIZE).heightOfString(value || "—", { width: cellWidth });
    return labelHeight(label) + 2 + valueH;
  }
  function drawCell(x: number, y: number, label: string, value: string) {
    doc.fontSize(LABEL_SIZE).fillColor("#64748b").text(label.toUpperCase(), x, y, { width: cellWidth });
    doc.fontSize(VALUE_SIZE).fillColor("#0f172a").text(value || "—", x, y + labelHeight(label) + 2, { width: cellWidth });
  }

  for (let i = 0; i < pairs.length; i += cols) {
    const rowPairs = pairs.slice(i, i + cols);
    const rowHeight = Math.max(...rowPairs.map((p) => cellHeight(p[0], p[1])));
    ensureSpace(doc, rowHeight + ROW_GAP);
    const rowY = doc.y;
    rowPairs.forEach(([label, value], idx) => drawCell(PAGE_MARGIN + idx * colWidth, rowY, label, value));
    doc.y = rowY + rowHeight + ROW_GAP;
  }
  doc.x = PAGE_MARGIN;
}

/** Fila de un checklist de sección 9/10: nombre del elemento + casilla de severidad con su color oficial. */
function severityRow(doc: Doc, name: string, tier: "CRITICO" | "SECUNDARIO", severity: string | null) {
  ensureSpace(doc, 17);
  const y = doc.y;
  doc.fontSize(9).fillColor("#334155").text(name, PAGE_MARGIN, y, { width: 250 });
  if (severity) {
    const color = severityBoxColor(tier, severity as any);
    const boxX = PAGE_MARGIN + 270;
    doc.roundedRect(boxX, y - 2, 85, 14, 3).fill(color);
    doc.fontSize(8).fillColor("#0f172a").text(SEVERITY_LABEL[severity] ?? severity, boxX, y + 1, { width: 85, align: "center" });
  } else {
    doc.fontSize(8).fillColor("#cbd5e1").text("No diligenciado", PAGE_MARGIN + 270, y + 1, { width: 85 });
  }
  doc.y = y + 15;
  doc.x = PAGE_MARGIN;
}

function photoThumbRow(doc: Doc, photos: any[] | undefined, thumbSize = 130) {
  if (!photos || !photos.length) return;
  const gap = 12;
  const perRow = Math.max(1, Math.floor((CONTENT_WIDTH + gap) / (thumbSize + gap)));
  ensureSpace(doc, thumbSize + 10);
  let rowTop = doc.y + 2;
  let col = 0;
  for (const p of photos) {
    if (col >= perRow) {
      doc.y = rowTop + thumbSize + 6;
      ensureSpace(doc, thumbSize + 10);
      rowTop = doc.y;
      col = 0;
    }
    const x = PAGE_MARGIN + col * (thumbSize + gap);
    const filePath = join(PUBLIC_DIR, p.url);
    try {
      if (existsSync(filePath)) {
        doc.roundedRect(x, rowTop, thumbSize, thumbSize, 4).lineWidth(0.75).strokeColor("#e2e8f0").stroke();
        doc.image(filePath, x, rowTop, { fit: [thumbSize, thumbSize] });
      }
    } catch {
      // Una foto puntual ilegible no debe romper el informe completo.
    }
    col++;
  }
  doc.y = rowTop + thumbSize + 10;
  doc.x = PAGE_MARGIN;
}

/**
 * Portada: banda de clasificación + foto de la edificación (si existe una
 * fotografía panorámica) como imagen de portada, con el nombre/dirección
 * superpuestos — mismo recurso visual que `wabim-bridges` usaba para su
 * banner de puente, adaptado aquí a la edificación evaluada.
 */
function addCoverPhoto(doc: Doc, photoUrl: string | undefined, insp: any): boolean {
  if (!photoUrl) return false;
  const filePath = join(PUBLIC_DIR, photoUrl);
  if (!existsSync(filePath)) return false;
  try {
    const bannerHeight = 220;
    ensureSpace(doc, bannerHeight + 15);
    doc.x = PAGE_MARGIN;
    const y = doc.y;
    doc.save();
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, bannerHeight, 6).clip();
    doc.image(filePath, PAGE_MARGIN, y, { width: CONTENT_WIDTH, height: bannerHeight, cover: [CONTENT_WIDTH, bannerHeight], align: "center", valign: "center" });
    doc.restore();
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, bannerHeight, 6).lineWidth(1).strokeColor("#cbd5e1").stroke();

    const barHeight = 40;
    doc.save();
    doc.fillOpacity(0.75);
    doc.rect(PAGE_MARGIN, y + bannerHeight - barHeight, CONTENT_WIDTH, barHeight).fill("#0f172a");
    doc.restore();
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13).text(
      insp.building_name || "Edificación sin nombre registrado",
      PAGE_MARGIN + 12,
      y + bannerHeight - barHeight + 7,
      { width: CONTENT_WIDTH - 24 },
    );
    doc.font("Helvetica").fontSize(9).fillColor("#e2e8f0").text(
      `${insp.address ?? "—"} · ${insp.municipality ?? "—"}, ${insp.department ?? "—"}`,
      PAGE_MARGIN + 12,
      y + bannerHeight - barHeight + 23,
      { width: CONTENT_WIDTH - 24 },
    );

    doc.y = y + bannerHeight + 12;
    doc.x = PAGE_MARGIN;
    doc.fillColor("#0f172a");
    return true;
  } catch {
    return false;
  }
}

export function buildInspectionReportPdf(inspectionId: string): Doc {
  const insp = getInspection(inspectionId) as any;
  if (!insp) throw new Error(`Inspección no encontrada: ${inspectionId}`);

  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });

  // =========================================================================
  // PORTADA
  // =========================================================================
  addFormHeader(doc);
  doc.fontSize(8.5).fillColor("#94a3b8").text(
    `No. de formulario: ${insp.form_number ?? "—"}   ·   ID Zona: ${insp.zone_id ?? "—"}   ·   Generado el ${new Date().toLocaleDateString("es-CO")}`,
    PAGE_MARGIN,
    doc.y,
    { width: CONTENT_WIDTH },
  );
  doc.moveDown(0.6);

  const hab = insp.habitability ? HABITABILITY_META[insp.habitability] : null;
  const dmgLevel = insp.damage_level ? DAMAGE_LEVEL_META[insp.damage_level] : null;
  ensureSpace(doc, 56);
  const bandY = doc.y;
  doc.roundedRect(PAGE_MARGIN, bandY, CONTENT_WIDTH, 48, 6).fill(hab ? hab.hex : "#e2e8f0");
  doc.fontSize(15).font("Helvetica-Bold").fillColor(hab ? hab.textHex : "#475569").text(hab ? hab.label.toUpperCase() : "SIN CLASIFICAR", PAGE_MARGIN + 16, bandY + 9, { width: CONTENT_WIDTH - 200 });
  doc.fontSize(9.5).font("Helvetica").fillColor(hab ? hab.textHex : "#475569").text(`Nivel de daño: ${dmgLevel ? dmgLevel.label : "—"}`, PAGE_MARGIN + 16, bandY + 29, { width: CONTENT_WIDTH - 200 });
  doc.fontSize(8.5).fillColor(hab ? hab.textHex : "#475569").text(`Inspector: ${insp.evaluator_name ?? "—"}\nFecha: ${insp.inspection_date ?? "—"}`, PAGE_MARGIN + CONTENT_WIDTH - 180, bandY + 9, { width: 168, align: "right" });
  doc.y = bandY + 58;
  doc.x = PAGE_MARGIN;
  doc.fillColor("#0f172a");

  const panoramicPhotos = (insp.photos as any[]).filter((p) => p.kind === "PANORAMICA");
  addCoverPhoto(doc, panoramicPhotos[0]?.url, insp);

  sectionBanner(doc, "Resumen de identificación");
  keyValueGrid(doc, [
    ["Dirección", insp.address ?? "—"],
    ["Nombre de la edificación", insp.building_name ?? "—"],
    ["Municipio / Departamento", `${insp.municipality ?? "—"} / ${insp.department ?? "—"}`],
    ["Coordenadas (WGS84)", insp.latitude != null ? `${insp.latitude}, ${insp.longitude}` : "—"],
    ["Entidad", insp.entity ?? "—"],
    ["Tipo de amenaza", labelList(THREAT_TYPES, insp.threatTypes)],
  ], 2);

  if ((insp.num_deaths || insp.num_injured || insp.num_missing || insp.num_affected)) {
    const victimBadges = [
      insp.num_deaths ? `${fmtNum(insp.num_deaths)} muertos` : null,
      insp.num_injured ? `${fmtNum(insp.num_injured)} heridos` : null,
      insp.num_missing ? `${fmtNum(insp.num_missing)} desaparecidos` : null,
      insp.num_affected ? `${fmtNum(insp.num_affected)} damnificados` : null,
    ].filter(Boolean).join("   ·   ");
    ensureSpace(doc, 24);
    doc.roundedRect(PAGE_MARGIN, doc.y, CONTENT_WIDTH, 20, 4).lineWidth(1).strokeColor("#ef4444").stroke();
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#b91c1c").text(`⚠ Víctimas: ${victimBadges}`, PAGE_MARGIN + 8, doc.y + 5, { width: CONTENT_WIDTH - 16 });
    doc.moveDown(1.2);
    doc.x = PAGE_MARGIN;
    doc.font("Helvetica").fillColor("#0f172a");
  }

  // El pie de página (sellos + numeración) se dibuja al final para TODAS las
  // páginas de una sola vez (ver el bucle sobre `bufferedPageRange()` al
  // cierre de esta función) — dibujarlo aquí también duplicaría el texto
  // superpuesto sobre la portada.

  // =========================================================================
  // SECCIONES DEL FORMULARIO
  // =========================================================================
  doc.addPage();
  addFormHeader(doc);

  sectionBanner(doc, "1. Identificación de la evaluación");
  keyValueGrid(doc, [
    ["Nombre del evaluador", insp.evaluator_name ?? "—"],
    ["Fecha / hora", `${insp.inspection_date ?? "—"} ${insp.inspection_time ?? ""} ${insp.inspection_time_period ?? ""}`.trim()],
    ["ID Zona / ID Grupo", `${insp.zone_id ?? "—"} / ${insp.group_id ?? "—"}`],
    ["Entidad", insp.entity ?? "—"],
    ["Persona de contacto", insp.contact_person ?? "—"],
    ["Núm. de contacto", insp.contact_phone ?? "—"],
    ["Tipo de amenaza", labelList(THREAT_TYPES, insp.threatTypes)],
    ["Tipo de inspección", insp.inspection_type === "COMPLETA" ? "Completa" : insp.inspection_type === "EXTERIOR" ? "Exterior solamente" : "—"],
  ]);

  sectionBanner(doc, "Víctimas y afectación humana", "Información complementaria — no forma parte del formulario impreso original.");
  keyValueGrid(doc, [
    ["Muertos", fmtNum(insp.num_deaths)],
    ["Heridos", fmtNum(insp.num_injured)],
    ["Desaparecidos", fmtNum(insp.num_missing)],
    ["Damnificados", fmtNum(insp.num_affected)],
  ], 3);
  if (insp.victims_notes) {
    doc.fontSize(9).fillColor("#475569").text(insp.victims_notes, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.3);
    doc.x = PAGE_MARGIN;
  }

  sectionBanner(doc, "2 / 12. Clasificación de habitabilidad y nivel de daño");
  keyValueGrid(doc, [
    ["Clasificación de habitabilidad", hab ? hab.label : "Sin clasificar"],
    ["Nivel de daño", dmgLevel ? dmgLevel.label : "—"],
  ]);

  sectionBanner(doc, "3. Información general — Localización");
  keyValueGrid(doc, [
    ["Departamento / Municipio", `${insp.department ?? "—"} / ${insp.municipality ?? "—"}`],
    ["Barrio / Vereda", insp.neighborhood ?? "—"],
    ["Zona", insp.area_type === "URBANO" ? "Urbano" : insp.area_type === "RURAL" ? "Rural" : "—"],
    ["Coordenadas (WGS84)", insp.latitude != null ? `${insp.latitude}, ${insp.longitude}` : "—"],
    ["Origen de la ubicación", insp.location_source === "GPS" ? "GPS automático" : insp.location_source === "MANUAL" ? "Ingreso manual" : "—"],
  ]);

  sectionBanner(doc, "4. Identificación de la edificación");
  keyValueGrid(doc, [
    ["Dirección", insp.address ?? "—"],
    ["Nombre de la edificación", insp.building_name ?? "—"],
    ["Uso de la edificación", labelList(BUILDING_USES, insp.buildingUses)],
    ["Núm. pisos sobre el nivel del suelo", String(insp.floors_above_ground ?? "—")],
    ["Núm. sótanos", String(insp.basements ?? "—")],
    ["Tipo de edificación", insp.building_ownership === "PUBLICA" ? "Pública" : insp.building_ownership === "PRIVADA" ? "Privada" : "—"],
    ["Dimensiones aproximadas (frente x fondo, m)", insp.front_dimension != null ? `${insp.front_dimension} x ${insp.depth_dimension ?? "—"}` : "—"],
  ]);

  sectionBanner(doc, "5. Sistema estructural, entrepiso y cubierta");
  keyValueGrid(doc, [
    ["5.1 Sistema estructural", labelList(STRUCTURAL_SYSTEMS, insp.structuralSystems)],
    ["5.2 Sistema de entrepiso", labelList(FLOOR_SYSTEMS, insp.floorSystems)],
    ["5.3 Sistema de soporte de la cubierta", labelList(ROOF_SUPPORT_SYSTEMS, insp.roofSupportSystems)],
    ["5.4 Tipo de cubierta", labelList(ROOF_TYPES, insp.roofTypes)],
  ]);

  sectionBanner(doc, "6. Condiciones preexistentes y condiciones de entorno");
  keyValueGrid(doc, [
    ["6.1 Morfología del sitio", insp.site_morphology === "OTRO" ? `Otro: ${insp.site_morphology_other ?? ""}` : labelFor(SITE_MORPHOLOGY, insp.site_morphology)],
    ["6.2 Amenaza por cuerpos hídricos", insp.water_body_threat == null ? "—" : insp.water_body_threat ? `Sí (dist. aprox. ${insp.water_body_distance ?? "—"} m)` : "No"],
    ["6.3 ¿Hay piso débil?", insp.weak_story == null ? "N/A" : insp.weak_story ? "Sí" : "No"],
    ["6.4 ¿Hay piso con columna corta?", insp.short_column == null ? "N/A" : insp.short_column ? "Sí" : "No"],
    ["6.5 ¿Hay cambios drásticos de rigidez?", insp.stiffness_change == null ? "N/A" : insp.stiffness_change ? "Sí" : "No"],
  ], 3);
  if (insp.water_body_notes) {
    doc.fontSize(9).fillColor("#475569").text(`Observaciones: ${insp.water_body_notes}`, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.3);
    doc.x = PAGE_MARGIN;
  }

  sectionBanner(doc, "7. Peligro global  ·  8. Peligro por condiciones geotécnicas");
  keyValueGrid(doc, [
    ["Colapso total", fmtYesNo(insp.total_collapse)],
    ["Colapso parcial", fmtYesNo(insp.partial_collapse)],
    ["Inclinación evidente", fmtYesNo(insp.evident_tilt)],
    ["Riesgo por edificaciones adyacentes", fmtYesNo(insp.adjacent_building_risk)],
    ["Licuación / asentamiento / subsidencia del terreno", fmtYesNo(insp.soil_liquefaction)],
    ["Movimientos en masa cercanos", fmtYesNo(insp.nearby_landslides)],
  ]);

  sectionBanner(doc, "9. Peligro por daño en elementos estructurales", "N: Ninguno/Leve · M: Moderado · S: Severo");
  const structDamages = (insp.elementDamages as any[]).filter((d) => d.category === "ESTRUCTURAL");
  for (const code of ["COLUMNAS", "MUROS_PORTANTES", "VIGAS", "NODOS_CONEXION", "RIOSTRAS", "ENTREPISO"]) {
    const def = getElementDef(code)!;
    const found = structDamages.find((d) => d.element_code === code);
    severityRow(doc, def.name, def.tier, found?.severity ?? null);
  }

  sectionBanner(doc, "10. Peligro por daño en elementos no estructurales", "N: Ninguno/Leve · M: Moderado · S: Severo");
  const nonStructDamages = (insp.elementDamages as any[]).filter((d) => d.category === "NO_ESTRUCTURAL");
  for (const code of [
    "MUROS_FACHADA_ANTEPECHOS", "MUROS_DIVISORIOS", "VENTANALES_VIDRIOS_FACHADA", "CIELO_RASO_LUMINARIAS",
    "CUBIERTAS", "ESCALERAS", "ASCENSORES", "BALCONES", "TANQUES_ELEVADOS", "INSTALACIONES_GAS",
    "INSTALACIONES_ELECTRICAS", "ACUEDUCTO_ALCANTARILLADO", "OTROS",
  ]) {
    const def = getElementDef(code)!;
    const found = nonStructDamages.find((d) => d.element_code === code);
    const name = code === "OTROS" && found?.other_label ? `Otros: ${found.other_label}` : def.name;
    severityRow(doc, name, def.tier, found?.severity ?? null);
  }

  const plantaPhotos = (insp.photos as any[]).filter((p) => p.kind === "ESQUEMA_PLANTA");
  const elevacionPhotos = (insp.photos as any[]).filter((p) => p.kind === "ESQUEMA_ELEVACION");
  if (plantaPhotos.length || elevacionPhotos.length) {
    sectionBanner(doc, "11. Esquema — Planta y elevación");
    if (plantaPhotos.length) {
      doc.fontSize(8.5).fillColor("#64748b").text("Planta", PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
      photoThumbRow(doc, plantaPhotos, 200);
    }
    if (elevacionPhotos.length) {
      doc.fontSize(8.5).fillColor("#64748b").text("Elevación", PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
      photoThumbRow(doc, elevacionPhotos, 200);
    }
  }

  if (insp.damageRecords?.length) {
    sectionBanner(doc, "Detalle fotográfico de daños registrados", "Extensión con foto/descripción por elemento — complementa el checklist de las secciones 9-10.");
    for (const dr of insp.damageRecords as any[]) {
      ensureSpace(doc, 20);
      doc.x = PAGE_MARGIN;
      const sevLabel = dr.severity ? ` — ${SEVERITY_LABEL[dr.severity] ?? dr.severity}` : "";
      doc.fontSize(9.5).font("Helvetica-Bold").fillColor(BRAND_DARK).text(`${dr.element_label}${sevLabel}`, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.font("Helvetica").fontSize(8.5).fillColor("#475569");
      const details = [dr.location && `Ubicación: ${dr.location}`, dr.damage_type && `Tipo de daño: ${dr.damage_type}`, dr.extent && `Extensión: ${dr.extent}`]
        .filter(Boolean)
        .join("   ·   ");
      if (details) doc.text(details, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
      if (dr.description) doc.text(dr.description, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
      if (dr.recommendation) doc.fillColor("#166534").text(`Recomendación: ${dr.recommendation}`, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.fillColor("#0f172a");
      photoThumbRow(doc, dr.photos);
      doc.moveDown(0.3);
    }
  }

  const panoramicRest = panoramicPhotos.slice(1);
  if (panoramicRest.length) {
    sectionBanner(doc, "Registro fotográfico general adicional");
    photoThumbRow(doc, panoramicRest);
  }

  sectionBanner(doc, "13. Ocupación de la edificación");
  doc.fontSize(9.5).fillColor("#0f172a").text(insp.occupation_status === "OCUPADA" ? "Ocupada" : insp.occupation_status === "DESOCUPADA" ? "Desocupada" : "—", PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });

  sectionBanner(doc, "14. Recomendaciones y medidas de seguridad");
  const recos = (insp.safetyRecommendations ?? []) as any[];
  if (!recos.length) {
    doc.fontSize(8.5).fillColor("#94a3b8").text("Sin recomendaciones marcadas.", PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  } else {
    for (const r of recos) {
      ensureSpace(doc, 13);
      const label = r.code === "OTRO" && r.otherText ? `Otro: ${r.otherText}` : labelFor(SAFETY_RECOMMENDATIONS, r.code);
      doc.fontSize(9).fillColor("#334155").text(`•  ${label}`, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
    }
  }

  if (insp.previous_evaluation_exists) {
    sectionBanner(doc, "Evaluación previa");
    keyValueGrid(doc, [
      ["Tipo de evaluación", insp.previous_evaluation_type ?? "—"],
      ["Entidad", insp.previous_evaluation_entity ?? "—"],
      ["Clasificación previa", insp.previous_evaluation_habitability ? (HABITABILITY_META[insp.previous_evaluation_habitability]?.label ?? insp.previous_evaluation_habitability) : "—"],
      ["Fecha", insp.previous_evaluation_date ?? "—"],
    ]);
  }

  sectionBanner(doc, "15. Comentarios finales");
  doc.fontSize(9.5).fillColor("#0f172a").text(insp.final_comments || "Sin comentarios adicionales.", PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });

  sectionBanner(doc, "16. Información del evaluador");
  keyValueGrid(doc, [
    ["Nombre", insp.evaluator_name ?? "—"],
    ["ID Evaluador", insp.evaluator_id_code ?? "—"],
    ["Tipo / Núm. de documento", `${insp.evaluator_doc_type ?? "—"} ${insp.evaluator_doc_number ?? ""}`.trim()],
    ["Entidad", insp.evaluator_entity ?? "—"],
    ["Dependencia", insp.evaluator_dependencia ?? "—"],
    ["Funcionario responsable", insp.responsible_official_name ?? "—"],
    ["C.C. funcionario responsable", insp.responsible_official_cc ?? "—"],
    ["Entidad funcionario responsable", insp.responsible_official_entity ?? "—"],
  ]);

  // =========================================================================
  // CRÉDITOS DE LA HERRAMIENTA (no forma parte del formulario impreso)
  // =========================================================================
  sectionBanner(doc, "Créditos", "Esta sección identifica la herramienta digital — no forma parte del formulario oficial impreso.");
  const utpLogo = logoPath("utp.png");
  ensureSpace(doc, 60);
  const creditsY = doc.y;
  let logoX = PAGE_MARGIN;
  const logoH2 = 34;
  if (existsSync(utpLogo)) {
    const w = logoH2; // utp.png es ~cuadrado
    doc.image(utpLogo, logoX, creditsY, { height: logoH2 });
    logoX += w + 14;
  }
  doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#1e293b").text(
    "Herramienta desarrollada por: Ing. Cristhian Camilo Amariles López",
    PAGE_MARGIN,
    creditsY + logoH2 + 8,
    { width: CONTENT_WIDTH },
  );
  doc.font("Helvetica").fontSize(8).fillColor("#64748b").text(
    "Universidad Tecnológica de Pereira",
    PAGE_MARGIN,
    doc.y,
    { width: CONTENT_WIDTH },
  );
  doc.moveDown(0.4);
  doc.x = PAGE_MARGIN;
  doc.fontSize(7.5).fillColor("#94a3b8").text(
    "Metodología base: Formulario Regional para Evaluación Rápida de Daños en Edificaciones (V.1.0 - 03/2023), Sistema Nacional de Gestión del Riesgo de Desastres, con apoyo de USAID y Miyamoto International. " +
      "Criterios de patología estructural de referencia: Guía de Patologías Constructivas, Estructurales y No Estructurales (FOPAE - AIS, 3ª edición, 2011).",
    PAGE_MARGIN,
    doc.y,
    { width: CONTENT_WIDTH },
  );

  // --- Pie de página en todas las páginas ---
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    addFooter(doc, insp.form_number, `Página ${i + 1} de ${range.count}`);
  }

  doc.end();
  return doc;
}
