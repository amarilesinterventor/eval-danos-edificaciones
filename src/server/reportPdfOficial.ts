/**
 * Generador del "formato oficial" — réplica vectorial fiel del formulario
 * impreso "2A - Formulario regional homogenizado" (Formulario Regional para
 * Evaluación Rápida de Daños en Edificaciones, V.1.0 - 03/2023), diligenciada
 * con los datos de la inspección, para el caso en que el organismo de
 * atención de desastres exija su propio formato oficial en vez del informe
 * rediseñado de `reportPdf.ts`. El inspector puede generar CUALQUIERA de los
 * dos formatos (o ambos) desde el paso 8 — ver GET /report.pdf y
 * GET /report-oficial.pdf en src/server/server.ts.
 *
 * Enfoque de implementación (decisión documentada en
 * docs/ANALISIS-Y-ARQUITECTURA.md §10): en vez de superponer casillas sobre
 * una imagen rasterizada de las páginas originales del PDF fuente, este
 * archivo REDIBUJA el formulario en vectores (mismas 16 secciones, mismo
 * orden, mismas opciones textuales exactas del formulario impreso — ver la
 * transcripción completa en docs/ANALISIS-Y-ARQUITECTURA.md §1 — y el mismo
 * patrón de semaforización de colores). Se descartó la superposición sobre
 * el PDF original porque: (a) el texto del PDF fuente tiene un cmap de
 * fuente no estándar que hace que la extracción automática de texto salga
 * ilegible, así que emparejar cada una de las ~169 casillas detectadas con
 * su campo exacto solo podía hacerse leyendo capturas anotadas a mano, con
 * riesgo real de marcar una casilla equivocada en un documento que puede
 * usar una entidad de atención de desastres; y (b) redibujar en vectores
 * garantiza que la casilla que se dibuja y la marca de verificación que la
 * llena usan exactamente las mismas coordenadas (las calcula el mismo
 * código), eliminando ese riesgo por construcción. El resultado reproduce
 * fielmente la estructura, el texto y el orden del formulario oficial —
 * que es lo que la entidad receptora necesita reconocer — con el beneficio
 * adicional de texto vectorial nítido en vez de una imagen de fondo.
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
  getElementDef,
} from "../domain/catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "..", "public");
const LOGOS_DIR = join(PUBLIC_DIR, "assets", "logos");
function logoPath(name: string): string {
  return join(LOGOS_DIR, name);
}

type Doc = PDFKit.PDFDocument;

// --- Geometría de página: tamaño Carta, igual al formulario impreso original
// (confirmado al renderizar el PDF fuente: 612x792pt = Carta) ---------------
const PAGE_MARGIN = 24;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const FOOTER_RESERVED = 34;

const INK = "#0f172a";
const BORDER = "#94a3b8";
const LABEL_COLOR = "#64748b";
const BAR_COLOR = "#1e3a5f";

function bottomLimit(doc: Doc): number {
  return doc.page.height - FOOTER_RESERVED;
}
/** Reserva `needed` puntos verticales desde `doc.y`; salta de página si no caben. Debe llamarse con `doc.y` ya sincronizado con la posición real del cursor. */
function ensureSpace(doc: Doc, needed: number) {
  if (doc.y + needed > bottomLimit(doc)) {
    doc.addPage();
    addPageHeader(doc);
  }
}

// ---------------------------------------------------------------------------
// Primitivas de dibujo: casilla de verificación (con o sin relleno de color
// pre-impreso, igual al semáforo del formulario original) y opciones en
// flujo (checkbox + etiqueta, con ajuste de línea automático).
// ---------------------------------------------------------------------------
function drawCheckbox(doc: Doc, x: number, y: number, checked: boolean, size: number, fill?: string) {
  if (fill) {
    doc.rect(x, y, size, size).fill(fill);
  }
  doc.rect(x, y, size, size).lineWidth(0.6).strokeColor("#000000").stroke();
  if (checked) {
    doc.save();
    doc.lineWidth(1.3).strokeColor("#000000").lineCap("round");
    const pad = size * 0.18;
    doc.moveTo(x + pad, y + pad).lineTo(x + size - pad, y + size - pad).stroke();
    doc.moveTo(x + size - pad, y + pad).lineTo(x + pad, y + size - pad).stroke();
    doc.restore();
  }
}

interface SemOption {
  code: string;
  label: string;
  fill?: string;
}
interface LaidOutItem extends SemOption {
  checked: boolean;
  dx: number;
  dy: number;
}
interface OptionsLayout {
  items: LaidOutItem[];
  height: number;
}

const CHECKBOX_SIZE = 7.2;
const OPTION_FONT = 7.2;
const EMPTY_SET: Set<string> = new Set();

/** Calcula la posición (relativa a un origen) de cada opción, ajustando línea cuando se excede el ancho — sin dibujar todavía. Mismo objeto se usa luego para dibujar, así que medida y dibujo nunca pueden desincronizarse. */
function layoutOptions(doc: Doc, options: SemOption[], width: number, selected: Set<string>, otherText: string | undefined, rowH = 11.5, gapX = 13): OptionsLayout {
  doc.font("Helvetica").fontSize(OPTION_FONT);
  let cx = 0;
  let cy = 0;
  const items: LaidOutItem[] = [];
  for (const o of options) {
    const checked = selected.has(o.code);
    const label = checked && o.code === "OTRO" && otherText ? `${o.label}: ${otherText}` : o.label;
    const w = CHECKBOX_SIZE + 4 + doc.widthOfString(label);
    if (cx > 0 && cx + w > width) {
      cx = 0;
      cy += rowH;
    }
    items.push({ ...o, label, checked, dx: cx, dy: cy });
    cx += w + gapX;
  }
  return { items, height: cy + rowH };
}
function drawOptions(doc: Doc, x: number, y: number, layout: OptionsLayout) {
  for (const it of layout.items) {
    drawCheckbox(doc, x + it.dx, y + it.dy + 1.5, it.checked, CHECKBOX_SIZE, it.fill);
    doc.font("Helvetica").fontSize(OPTION_FONT).fillColor(INK).text(it.label, x + it.dx + CHECKBOX_SIZE + 4, y + it.dy, { lineBreak: false });
  }
}

// ---------------------------------------------------------------------------
// Campos de un formulario: caja con etiqueta pequeña arriba y, debajo, o bien
// un valor de texto o bien un grupo de casillas de verificación (nunca los
// dos superpuestos — la altura de la caja se calcula a partir del contenido
// real que va a dibujarse, así que no hay riesgo de que el texto tape a las
// casillas ni viceversa).
// ---------------------------------------------------------------------------
interface FieldSpec {
  label: string;
  value?: string;
  weight?: number;
  checkboxes?: SemOption[];
  checkboxSelected?: Set<string>;
  checkboxOther?: string;
}
function fieldsRow(doc: Doc, x: number, y: number, width: number, fields: FieldSpec[], minRowH = 24): number {
  const gap = 6;
  const totalWeight = fields.reduce((s, f) => s + (f.weight || 1), 0);
  const usable = width - gap * (fields.length - 1);
  const widths = fields.map((f) => (usable * (f.weight || 1)) / totalWeight);
  const layouts = fields.map((f, i) => (f.checkboxes ? layoutOptions(doc, f.checkboxes, widths[i] - 8, f.checkboxSelected ?? EMPTY_SET, f.checkboxOther, 11, 10) : null));
  const maxCbHeight = Math.max(0, ...layouts.map((l) => (l ? l.height : 0)));
  const h = layouts.some(Boolean) ? Math.max(minRowH, 13 + maxCbHeight + 4) : minRowH;
  let cx = x;
  fields.forEach((f, i) => {
    const w = widths[i];
    doc.rect(cx, y, w, h).lineWidth(0.6).strokeColor(BORDER).stroke();
    doc.fontSize(6.1).font("Helvetica-Bold").fillColor(LABEL_COLOR).text(f.label.toUpperCase(), cx + 4, y + 3, { width: w - 8, lineBreak: false });
    const layout = layouts[i];
    if (layout) {
      drawOptions(doc, cx + 4, y + 13, layout);
    } else {
      doc.fontSize(8.3).font("Helvetica").fillColor(INK).text(f.value || "—", cx + 4, y + 12.5, { width: w - 8, height: h - 14, ellipsis: true });
    }
    cx += w + gap;
  });
  return y + h;
}

/** Encabezado de sección numerada — barra oscura con el número/título exacto del formulario, replicado del original. */
function sectionHeader(doc: Doc, x: number, y: number, width: number, title: string, subtitle?: string): number {
  const barH = 14.5;
  doc.rect(x, y, width, barH).fill(BAR_COLOR);
  doc.fontSize(8.2).font("Helvetica-Bold").fillColor("#ffffff").text(title.toUpperCase(), x + 6, y + 3.2, { width: width - 12, lineBreak: false });
  let h = barH;
  if (subtitle) {
    doc.fontSize(6.4).font("Helvetica-Oblique").fillColor(LABEL_COLOR).text(subtitle, x, y + barH + 2, { width });
    h += 11;
  }
  return y + h + 3;
}

function groupLabel(doc: Doc, x: number, y: number, text: string): number {
  doc.fontSize(7).font("Helvetica-Bold").fillColor(INK).text(text, x, y, { lineBreak: false });
  return y + 10;
}

// ---------------------------------------------------------------------------
// Selecciones auxiliares — traduce los datos de la inspección (arreglos
// {code,otherText} o campos escalares) a Set<code> + texto "Otro" para
// alimentar layoutOptions().
// ---------------------------------------------------------------------------
function multiSelection(items: Array<{ code: string; otherText?: string }> | undefined): { set: Set<string>; other?: string } {
  const set = new Set((items ?? []).map((it) => it.code));
  const other = (items ?? []).find((it) => it.code === "OTRO")?.otherText;
  return { set, other };
}
function singleSelection(code: string | null | undefined): Set<string> {
  return new Set(code ? [code] : []);
}
function boolSelection(v: number | null | undefined): Set<string> {
  if (v == null) return EMPTY_SET;
  return new Set([v ? "SI" : "NO"]);
}

const YES_NO = (yesFill?: string): SemOption[] => [
  { code: "SI", label: "Sí", fill: yesFill },
  { code: "NO", label: "No" },
];
const TRI_STATE = (yesFill?: string): SemOption[] => [
  { code: "SI", label: "Sí", fill: yesFill },
  { code: "NO", label: "No" },
  { code: "NO_ES_CLARO", label: "No es claro" },
];
function severityOptions(tier: "CRITICO" | "SECUNDARIO"): SemOption[] {
  const badFill = tier === "CRITICO" ? "#ef4444" : "#eab308";
  return [
    { code: "NL", label: "N/L", fill: "#22c55e" },
    { code: "M", label: "M", fill: badFill },
    { code: "S", label: "S", fill: badFill },
  ];
}

/** Fila de elemento (secciones 9/10): nombre + 3 casillas N/L·M·S en línea. Reserva su propio espacio — puede llamarse en un bucle sin cálculo previo. */
function elementRow(doc: Doc, x: number, width: number, name: string, tier: "CRITICO" | "SECUNDARIO", severity: string | null) {
  const rowH = 13;
  ensureSpace(doc, rowH);
  const y = doc.y;
  const nameW = 230;
  doc.fontSize(7.8).font("Helvetica").fillColor(INK).text(name, x, y + 1.5, { width: nameW, lineBreak: false });
  const layout = layoutOptions(doc, severityOptions(tier), width - nameW, singleSelection(severity), undefined, rowH, 20);
  drawOptions(doc, x + nameW, y, layout);
  doc.y = y + rowH;
  doc.x = PAGE_MARGIN;
}

// ---------------------------------------------------------------------------
// Encabezado y pie de página (mismos logos institucionales que trae el
// propio formulario oficial — igual criterio y misma nota que reportPdf.ts).
// ---------------------------------------------------------------------------
function addPageHeader(doc: Doc) {
  const y = PAGE_MARGIN - 4;
  const logoH = 26;
  const sngrd = logoPath("sngrd.png");
  const usaidMiyamoto = logoPath("usaid_miyamoto.png");
  if (existsSync(sngrd)) doc.image(sngrd, PAGE_MARGIN, y, { height: logoH });
  if (existsSync(usaidMiyamoto)) {
    const w = logoH * (1040 / 272);
    doc.image(usaidMiyamoto, PAGE_MARGIN + CONTENT_WIDTH - w, y, { height: logoH });
  }
  const titleX = PAGE_MARGIN + 96;
  const titleWidth = CONTENT_WIDTH - 192;
  const titleText = "FORMULARIO REGIONAL PARA EVALUACIÓN RÁPIDA DE DAÑOS EN EDIFICACIONES";
  doc.fontSize(9.5).font("Helvetica-Bold").fillColor(BAR_COLOR);
  const titleHeight = doc.heightOfString(titleText, { width: titleWidth, align: "center" });
  doc.text(titleText, titleX, y + 2, { width: titleWidth, align: "center" });
  doc.fontSize(6.6).font("Helvetica").fillColor(LABEL_COLOR).text("2A - Formulario regional homogenizado · V.1.0 - 03/2023", titleX, y + 2 + titleHeight + 1, { width: titleWidth, align: "center" });
  doc.y = Math.max(y + 2 + titleHeight + 12, y + logoH) + 5;
  doc.x = PAGE_MARGIN;
  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).lineWidth(1).strokeColor(BAR_COLOR).stroke();
  doc.y += 5;
  doc.x = PAGE_MARGIN;
  doc.fillColor(INK);
}

function addPageFooter(doc: Doc, formNumber: string | null | undefined, pageLabel: string) {
  const seals = logoPath("entidades_regionales.png");
  const y = doc.page.height - FOOTER_RESERVED + 5;
  const originalBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  if (existsSync(seals)) {
    try {
      doc.image(seals, PAGE_MARGIN, y, { height: 13 });
    } catch {
      // un logo ilegible no debe romper el documento
    }
  }
  doc.fontSize(6.3).fillColor("#94a3b8").text(
    `No. formulario: ${formNumber || "—"}   ·   Diligenciado digitalmente — Herramienta de Evaluación Rápida de Daños en Edificaciones (Ing. Cristhian Camilo Amariles López · UTP)   ·   ${pageLabel}`,
    PAGE_MARGIN,
    y + 17,
    { width: CONTENT_WIDTH, align: "center" },
  );
  doc.page.margins.bottom = originalBottomMargin;
}

function sketchBox(doc: Doc, x: number, y: number, w: number, h: number, label: string, photoPath: string | null) {
  doc.rect(x, y, w, h).lineWidth(0.75).strokeColor("#000000").stroke();
  doc.fontSize(7.2).font("Helvetica-Bold").fillColor(INK).text(label, x + 4, y + 3);
  if (photoPath && existsSync(photoPath)) {
    try {
      doc.image(photoPath, x + 3, y + 15, { fit: [w - 6, h - 18], align: "center", valign: "center" });
      return;
    } catch {
      // si la imagen no se puede leer, cae al recuadro cuadriculado de abajo
    }
  }
  doc.save();
  doc.lineWidth(0.3).strokeColor("#e2e8f0");
  for (let gx = x + 8; gx < x + w - 4; gx += 10) doc.moveTo(gx, y + 16).lineTo(gx, y + h - 4).stroke();
  for (let gy = y + 20; gy < y + h - 4; gy += 10) doc.moveTo(x + 4, gy).lineTo(x + w - 4, gy).stroke();
  doc.restore();
}

const HAB_OPTIONS: SemOption[] = [
  { code: "VERDE", label: "Habitable", fill: "#22c55e" },
  { code: "AMARILLO", label: "Uso restringido", fill: "#eab308" },
  { code: "ROJO", label: "No habitable", fill: "#ef4444" },
];
const DMG_OPTIONS: SemOption[] = [
  { code: "NINGUNO_MENOR", label: "Ninguno/Menor", fill: "#22c55e" },
  { code: "MODERADO", label: "Moderado", fill: "#eab308" },
  { code: "SEVERO", label: "Severo", fill: "#ef4444" },
];

// =============================================================================
export function buildOfficialReportPdf(inspectionId: string): Doc {
  const insp = getInspection(inspectionId) as any;
  if (!insp) throw new Error(`Inspección no encontrada: ${inspectionId}`);

  const doc = new PDFDocument({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: PAGE_MARGIN, bufferPages: true });
  const X = PAGE_MARGIN;
  const W = CONTENT_WIDTH;

  addPageHeader(doc);

  // --- Identificación general (No. formulario / ID zona / ID grupo) --------
  ensureSpace(doc, 26);
  doc.y = fieldsRow(doc, X, doc.y, W, [
    { label: "No. de formulario", value: insp.form_number ?? "" },
    { label: "ID Zona", value: insp.zone_id ?? "" },
    { label: "ID Grupo", value: insp.group_id ?? "" },
  ]);
  doc.y += 4;
  doc.x = X;

  // =========================================================================
  // 1. IDENTIFICACIÓN DE LA EVALUACIÓN
  // =========================================================================
  {
    const threatSel = multiSelection(insp.threatTypes);
    const threatLayout = layoutOptions(doc, THREAT_TYPES.map((t) => ({ code: t.code, label: t.label })), W, threatSel.set, threatSel.other);
    ensureSpace(doc, 14.5 + 3 + 27 * 2 + 8 + 10 + threatLayout.height + 6);
    let y = sectionHeader(doc, X, doc.y, W, "1. Identificación de la evaluación");
    y = fieldsRow(doc, X, y, W, [
      { label: "Nombre del evaluador", value: insp.evaluator_name ?? "", weight: 2 },
      { label: "Fecha", value: insp.inspection_date ?? "" },
      { label: "Hora", value: insp.inspection_time ?? "" },
      { label: "Periodo", checkboxes: [{ code: "am", label: "a.m." }, { code: "pm", label: "p.m." }], checkboxSelected: singleSelection(insp.inspection_time_period), weight: 0.9 },
    ]);
    y += 4;
    y = fieldsRow(doc, X, y, W, [
      { label: "Entidad", value: insp.entity ?? "", weight: 2 },
      { label: "ID Grupo", value: insp.group_id ?? "" },
      { label: "Persona de contacto", value: insp.contact_person ?? "", weight: 1.6 },
      { label: "Núm. de contacto", value: insp.contact_phone ?? "", weight: 1.2 },
    ]);
    y += 6;
    y = groupLabel(doc, X, y, "Tipo de amenaza:");
    drawOptions(doc, X, y, threatLayout);
    y += threatLayout.height + 4;
    doc.y = y;
    doc.x = X;
  }

  // =========================================================================
  // 2. CLASIFICACIÓN DE HABITABILIDAD Y NIVEL DE DAÑO
  // =========================================================================
  {
    const inspTypeLayout = layoutOptions(doc, [{ code: "EXTERIOR", label: "Exterior solamente" }, { code: "COMPLETA", label: "Completa" }], 220, singleSelection(insp.inspection_type), undefined);
    const habLayout = layoutOptions(doc, HAB_OPTIONS, 260, singleSelection(insp.habitability), undefined);
    const dmgLayout = layoutOptions(doc, DMG_OPTIONS, 260, singleSelection(insp.damage_level), undefined);
    ensureSpace(doc, 14.5 + 3 + 10 + inspTypeLayout.height + 4 + 10 + habLayout.height + 4 + 10 + dmgLayout.height + 6);
    let y = sectionHeader(doc, X, doc.y, W, "2. Clasificación de habitabilidad y nivel de daño");
    y = groupLabel(doc, X, y, "Tipo de inspección:");
    drawOptions(doc, X, y, inspTypeLayout);
    y += inspTypeLayout.height + 4;
    y = groupLabel(doc, X, y, "Habitabilidad:");
    drawOptions(doc, X, y, habLayout);
    y += habLayout.height + 4;
    y = groupLabel(doc, X, y, "Nivel de daño:");
    drawOptions(doc, X, y, dmgLayout);
    y += dmgLayout.height + 4;
    doc.y = y;
    doc.x = X;
  }

  // =========================================================================
  // 3. INFORMACIÓN GENERAL
  // =========================================================================
  {
    ensureSpace(doc, 14.5 + 3 + 27 + 4 + 24 + 6);
    let y = sectionHeader(doc, X, doc.y, W, "3. Información general");
    y = fieldsRow(doc, X, y, W, [
      { label: "Departamento", value: insp.department ?? "" },
      { label: "Municipio", value: insp.municipality ?? "" },
      { label: "Barrio / Vereda", value: insp.neighborhood ?? "" },
      { label: "Zona", checkboxes: [{ code: "URBANO", label: "Urbano" }, { code: "RURAL", label: "Rural" }], checkboxSelected: singleSelection(insp.area_type), weight: 0.9 },
    ]);
    y += 4;
    y = fieldsRow(doc, X, y, W, [
      { label: "Longitud WGS84", value: insp.longitude != null ? String(insp.longitude) : "" },
      { label: "Latitud WGS84", value: insp.latitude != null ? String(insp.latitude) : "" },
    ]);
    y += 4;
    doc.y = y;
    doc.x = X;
  }

  // =========================================================================
  // 4. IDENTIFICACIÓN DE LA EDIFICACIÓN
  // =========================================================================
  {
    const useSel = multiSelection(insp.buildingUses);
    const useLayout = layoutOptions(doc, BUILDING_USES.map((u) => ({ code: u.code, label: u.label })), W, useSel.set, useSel.other);
    ensureSpace(doc, 14.5 + 3 + 24 * 2 + 8 + 10 + useLayout.height + 6);
    let y = sectionHeader(doc, X, doc.y, W, "4. Identificación de la edificación");
    y = fieldsRow(doc, X, y, W, [
      { label: "Dirección", value: insp.address ?? "", weight: 2 },
      { label: "Nombre de la edificación", value: insp.building_name ?? "", weight: 2 },
    ]);
    y += 4;
    y = fieldsRow(doc, X, y, W, [
      { label: "Núm. pisos sobre el suelo", value: insp.floors_above_ground != null ? String(insp.floors_above_ground) : "" },
      { label: "Núm. sótanos", value: insp.basements != null ? String(insp.basements) : "" },
      { label: "Dimensiones aprox. frente x fondo (m)", value: insp.front_dimension != null ? `${insp.front_dimension} x ${insp.depth_dimension ?? "—"}` : "", weight: 1.6 },
      { label: "Tipo", checkboxes: [{ code: "PUBLICA", label: "Pública" }, { code: "PRIVADA", label: "Privada" }], checkboxSelected: singleSelection(insp.building_ownership), weight: 1 },
    ]);
    y += 6;
    y = groupLabel(doc, X, y, "Uso:");
    drawOptions(doc, X, y, useLayout);
    y += useLayout.height + 4;
    doc.y = y;
    doc.x = X;
  }

  // =========================================================================
  // 5. SISTEMA ESTRUCTURAL, ENTREPISO Y CUBIERTA
  // =========================================================================
  {
    const s1 = multiSelection(insp.structuralSystems);
    const s2 = multiSelection(insp.floorSystems);
    const s3 = multiSelection(insp.roofSupportSystems);
    const s4 = multiSelection(insp.roofTypes);
    const groups: Array<[string, OptionsLayout]> = [
      ["5.1 Sistema estructural:", layoutOptions(doc, STRUCTURAL_SYSTEMS.map((o) => ({ code: o.code, label: o.label })), W, s1.set, s1.other)],
      ["5.2 Sistema de entrepiso:", layoutOptions(doc, FLOOR_SYSTEMS.map((o) => ({ code: o.code, label: o.label })), W, s2.set, s2.other)],
      ["5.3 Sistema de soporte de la cubierta:", layoutOptions(doc, ROOF_SUPPORT_SYSTEMS.map((o) => ({ code: o.code, label: o.label })), W, s3.set, s3.other)],
      ["5.4 Tipo de cubierta:", layoutOptions(doc, ROOF_TYPES.map((o) => ({ code: o.code, label: o.label })), W, s4.set, s4.other)],
    ];
    // Reserva encabezado + primer subgrupo juntos para que la barra de
    // sección nunca quede huérfana al final de una página.
    ensureSpace(doc, 14.5 + 3 + 10 + groups[0][1].height + 4);
    let y = sectionHeader(doc, X, doc.y, W, "5. Sistema estructural, entrepiso y cubierta");
    for (const [label, layout] of groups) {
      doc.y = y;
      doc.x = X;
      ensureSpace(doc, 10 + layout.height + 4);
      y = doc.y;
      y = groupLabel(doc, X, y, label);
      drawOptions(doc, X, y, layout);
      y += layout.height + 4;
    }
    doc.y = y;
    doc.x = X;
  }

  // =========================================================================
  // 6. CONDICIONES PREEXISTENTES Y DE ENTORNO
  // =========================================================================
  {
    const morphOther = insp.site_morphology === "OTRO" ? insp.site_morphology_other : undefined;
    const morphLayout = layoutOptions(doc, SITE_MORPHOLOGY.map((o) => ({ code: o.code, label: o.label })), W, singleSelection(insp.site_morphology), morphOther);
    const isSismo = (insp.threatTypes ?? []).some((t: any) => t.code === "SISMO");
    ensureSpace(doc, 14.5 + 3 + 10 + morphLayout.height + 4 + 27 + 4 + (isSismo ? 27 + 4 : 0) + 4);
    let y = sectionHeader(doc, X, doc.y, W, "6. Condiciones preexistentes y condiciones de entorno");
    y = groupLabel(doc, X, y, "6.1 Morfología del sitio:");
    drawOptions(doc, X, y, morphLayout);
    y += morphLayout.height + 4;
    y = fieldsRow(doc, X, y, W, [
      { label: "6.2 ¿Amenaza por cuerpos hídricos?", checkboxes: YES_NO(), checkboxSelected: boolSelection(insp.water_body_threat), weight: 1 },
      { label: "Distancia aprox. (m)", value: insp.water_body_distance != null ? String(insp.water_body_distance) : "", weight: 1 },
      { label: "Observaciones", value: insp.water_body_notes ?? "", weight: 2 },
    ]);
    y += 4;
    if (isSismo) {
      y = fieldsRow(doc, X, y, W, [
        { label: "6.3 ¿Piso débil?", checkboxes: YES_NO(), checkboxSelected: boolSelection(insp.weak_story) },
        { label: "6.4 ¿Columna corta?", checkboxes: YES_NO(), checkboxSelected: boolSelection(insp.short_column) },
        { label: "6.5 ¿Cambios drásticos de rigidez?", checkboxes: YES_NO(), checkboxSelected: boolSelection(insp.stiffness_change) },
      ]);
      y += 4;
    }
    doc.y = y;
    doc.x = X;
  }

  // =========================================================================
  // 7. PELIGRO GLOBAL   ·   8. PELIGRO POR CONDICIONES GEOTÉCNICAS
  // =========================================================================
  {
    const rows: Array<[string, SemOption[], Set<string>]> = [
      ["Colapso total:", TRI_STATE("#ef4444"), singleSelection(insp.total_collapse)],
      ["Colapso parcial:", TRI_STATE("#eab308"), singleSelection(insp.partial_collapse)],
      ["Inclinación evidente:", TRI_STATE("#ef4444"), singleSelection(insp.evident_tilt)],
      ["Riesgo por edificaciones adyacentes:", TRI_STATE("#eab308"), singleSelection(insp.adjacent_building_risk)],
      ["Licuación / asentamiento / subsidencia del terreno:", YES_NO("#ef4444"), singleSelection(insp.soil_liquefaction)],
      ["Movimientos en masa cercanos:", YES_NO("#ef4444"), singleSelection(insp.nearby_landslides)],
    ];
    const rowH = 11.5;
    ensureSpace(doc, 14.5 + 3 + (rowH + 4) * rows.length + 4);
    let y = sectionHeader(doc, X, doc.y, W, "7. Peligro global  ·  8. Peligro por condiciones geotécnicas");
    for (const [label, options, selected] of rows) {
      groupLabel(doc, X, y, label);
      const layout = layoutOptions(doc, options, W - 200, selected, undefined, rowH, 16);
      drawOptions(doc, X + 200, y, layout);
      y += rowH + 4;
    }
    doc.y = y;
    doc.x = X;
  }

  // =========================================================================
  // 9. PELIGRO POR DAÑO EN ELEMENTOS ESTRUCTURALES
  // =========================================================================
  {
    ensureSpace(doc, 14.5 + 11 + 13);
    doc.y = sectionHeader(doc, X, doc.y, W, "9. Peligro por daño en elementos estructurales", "N/L: Ninguno/Leve  ·  M: Moderado  ·  S: Severo");
    doc.x = X;
    const structDamages = (insp.elementDamages as any[]).filter((d) => d.category === "ESTRUCTURAL");
    for (const code of ["COLUMNAS", "MUROS_PORTANTES", "VIGAS", "NODOS_CONEXION", "RIOSTRAS", "ENTREPISO"]) {
      const def = getElementDef(code)!;
      const found = structDamages.find((d) => d.element_code === code);
      elementRow(doc, X, W, def.name, def.tier, found?.severity ?? null);
    }
    doc.y += 3;
    doc.x = X;
  }

  // =========================================================================
  // 10. PELIGRO POR DAÑO EN ELEMENTOS NO ESTRUCTURALES
  // =========================================================================
  {
    const codes = [
      "MUROS_FACHADA_ANTEPECHOS", "MUROS_DIVISORIOS", "VENTANALES_VIDRIOS_FACHADA", "CIELO_RASO_LUMINARIAS",
      "CUBIERTAS", "ESCALERAS", "ASCENSORES", "BALCONES", "TANQUES_ELEVADOS", "INSTALACIONES_GAS",
      "INSTALACIONES_ELECTRICAS", "ACUEDUCTO_ALCANTARILLADO", "OTROS",
    ];
    ensureSpace(doc, 14.5 + 11 + 13);
    doc.y = sectionHeader(doc, X, doc.y, W, "10. Peligro por daño en elementos no estructurales", "N/L: Ninguno/Leve  ·  M: Moderado  ·  S: Severo");
    doc.x = X;
    const nonStructDamages = (insp.elementDamages as any[]).filter((d) => d.category === "NO_ESTRUCTURAL");
    for (const code of codes) {
      const def = getElementDef(code)!;
      const found = nonStructDamages.find((d) => d.element_code === code);
      const name = code === "OTROS" && found?.other_label ? `Otros: ${found.other_label}` : def.name;
      elementRow(doc, X, W, name, def.tier, found?.severity ?? null);
    }
    doc.y += 3;
    doc.x = X;
  }

  // =========================================================================
  // 11. ESQUEMA — PLANTA Y ELEVACIÓN
  // =========================================================================
  {
    const boxH = 130;
    ensureSpace(doc, 14.5 + 3 + boxH + 6);
    const y = sectionHeader(doc, X, doc.y, W, "11. Esquema", "Planta y elevación");
    const boxW = (W - 10) / 2;
    const plantaPhotos = (insp.photos as any[]).filter((p) => p.kind === "ESQUEMA_PLANTA");
    const elevPhotos = (insp.photos as any[]).filter((p) => p.kind === "ESQUEMA_ELEVACION");
    sketchBox(doc, X, y, boxW, boxH, "Planta", plantaPhotos[0] ? join(PUBLIC_DIR, plantaPhotos[0].url) : null);
    sketchBox(doc, X + boxW + 10, y, boxW, boxH, "Elevación", elevPhotos[0] ? join(PUBLIC_DIR, elevPhotos[0].url) : null);
    doc.y = y + boxH + 6;
    doc.x = X;
  }

  // =========================================================================
  // 12. CLASIFICACIÓN DE HABITABILIDAD Y DEL DAÑO (repetición) + evaluación previa
  // =========================================================================
  {
    const habLayout = layoutOptions(doc, HAB_OPTIONS, 260, singleSelection(insp.habitability), undefined);
    const dmgLayout = layoutOptions(doc, DMG_OPTIONS, 260, singleSelection(insp.damage_level), undefined);
    const hasPrev = !!insp.previous_evaluation_exists;
    ensureSpace(doc, 14.5 + 11 + 10 + habLayout.height + 4 + 10 + dmgLayout.height + 4 + 27 + 4 + (hasPrev ? 24 + 4 : 0) + 4);
    let y = sectionHeader(doc, X, doc.y, W, "12. Clasificación de habitabilidad y del daño", "Repite la clasificación de la sección 2 — no es un segundo estado.");
    y = groupLabel(doc, X, y, "Habitabilidad:");
    drawOptions(doc, X, y, habLayout);
    y += habLayout.height + 4;
    y = groupLabel(doc, X, y, "Nivel de daño:");
    drawOptions(doc, X, y, dmgLayout);
    y += dmgLayout.height + 4;
    y = fieldsRow(doc, X, y, W, [{ label: "¿Existe evaluación previa?", checkboxes: YES_NO(), checkboxSelected: boolSelection(insp.previous_evaluation_exists) }]);
    y += 4;
    if (hasPrev) {
      y = fieldsRow(doc, X, y, W, [
        { label: "Tipo de evaluación", value: insp.previous_evaluation_type ?? "" },
        { label: "Entidad", value: insp.previous_evaluation_entity ?? "" },
        { label: "Clasificación previa", value: insp.previous_evaluation_habitability ? (HABITABILITY_META[insp.previous_evaluation_habitability]?.label ?? insp.previous_evaluation_habitability) : "" },
        { label: "Fecha", value: insp.previous_evaluation_date ?? "" },
      ]);
      y += 4;
    }
    doc.y = y;
    doc.x = X;
  }

  // =========================================================================
  // 13. OCUPACIÓN DE LA EDIFICACIÓN
  // =========================================================================
  {
    const occLayout = layoutOptions(doc, [{ code: "OCUPADA", label: "Ocupada" }, { code: "DESOCUPADA", label: "Desocupada" }], 200, singleSelection(insp.occupation_status), undefined);
    ensureSpace(doc, 14.5 + 3 + occLayout.height + 6);
    const y = sectionHeader(doc, X, doc.y, W, "13. Ocupación de la edificación");
    drawOptions(doc, X, y, occLayout);
    doc.y = y + occLayout.height + 4;
    doc.x = X;
  }

  // =========================================================================
  // 14. RECOMENDACIONES Y MEDIDAS DE SEGURIDAD
  // =========================================================================
  {
    const recSel = multiSelection(insp.safetyRecommendations);
    const recLayout = layoutOptions(doc, SAFETY_RECOMMENDATIONS.map((o) => ({ code: o.code, label: o.label })), W, recSel.set, recSel.other, 12.5);
    ensureSpace(doc, 14.5 + 3 + recLayout.height + 6);
    const y = sectionHeader(doc, X, doc.y, W, "14. Recomendaciones y medidas de seguridad");
    drawOptions(doc, X, y, recLayout);
    doc.y = y + recLayout.height + 4;
    doc.x = X;
  }

  // =========================================================================
  // 15. COMENTARIOS FINALES
  // =========================================================================
  {
    const boxH = 46;
    ensureSpace(doc, 14.5 + 3 + boxH + 6);
    const y = sectionHeader(doc, X, doc.y, W, "15. Comentarios finales");
    doc.rect(X, y, W, boxH).lineWidth(0.6).strokeColor(BORDER).stroke();
    doc.fontSize(8).font("Helvetica").fillColor(INK).text(insp.final_comments || "—", X + 5, y + 5, { width: W - 10, height: boxH - 10 });
    doc.y = y + boxH + 6;
    doc.x = X;
  }

  // =========================================================================
  // 16. INFORMACIÓN DEL EVALUADOR
  // =========================================================================
  {
    ensureSpace(doc, 14.5 + 3 + 24 + 4 + 27 + 4 + 24 + 6 + 10 + 24 + 4);
    let y = sectionHeader(doc, X, doc.y, W, "16. Información del evaluador");
    y = fieldsRow(doc, X, y, W, [
      { label: "Nombre", value: insp.evaluator_name ?? "", weight: 2 },
      { label: "ID evaluador", value: insp.evaluator_id_code ?? "" },
    ]);
    y += 4;
    y = fieldsRow(doc, X, y, W, [
      { label: "Tipo de documento", checkboxes: [{ code: "CC", label: "C.C." }, { code: "PASAPORTE", label: "Pasaporte" }], checkboxSelected: singleSelection(insp.evaluator_doc_type) },
      { label: "Núm. de documento", value: insp.evaluator_doc_number ?? "" },
      { label: "Entidad", value: insp.evaluator_entity ?? "" },
      { label: "Dependencia", value: insp.evaluator_dependencia ?? "" },
    ]);
    y += 4;
    y = fieldsRow(doc, X, y, W, [{ label: "Firma", value: "" }]);
    y += 8;
    doc.fontSize(7.4).font("Helvetica-Bold").fillColor(INK).text("Funcionario responsable", X, y, { lineBreak: false });
    y += 10;
    y = fieldsRow(doc, X, y, W, [
      { label: "Nombre", value: insp.responsible_official_name ?? "", weight: 2 },
      { label: "C.C.", value: insp.responsible_official_cc ?? "" },
      { label: "Entidad", value: insp.responsible_official_entity ?? "", weight: 1.5 },
    ]);
    doc.y = y + 4;
    doc.x = X;
  }

  // --- Pie de página en todas las páginas ---
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    addPageFooter(doc, insp.form_number, `Página ${i + 1} de ${range.count}`);
  }

  doc.end();
  return doc;
}
