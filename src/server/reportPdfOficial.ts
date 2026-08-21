/**
 * Generador del "formato oficial" — overlay EXACTO sobre las páginas reales
 * del formulario impreso original ("2A - Formulario regional homogenizado",
 * V.1.0 - 03/2023): mismo diseño, misma distribución, mismos campos, mismos
 * colores — porque literalmente son las mismas dos páginas del PDF fuente
 * (`assets/official-form/2a-formulario-regional-homogenizado.pdf`), con los
 * datos de la inspección dibujados encima en las coordenadas exactas de
 * cada casilla/campo. Alternativa al informe rediseñado de `reportPdf.ts` —
 * el inspector puede generar cualquiera de los dos (o ambos) desde el paso
 * 8, para el caso en que el organismo de atención de desastres exija
 * recibir la información en su propio formato oficial.
 *
 * Historial de esta implementación (ver docs/ANALISIS-Y-ARQUITECTURA.md
 * §10 para el detalle completo): la primera versión de este archivo
 * REDIBUJABA el formulario en vectores en vez de superponer sobre el PDF
 * real, precisamente para evitar el riesgo de marcar una casilla en el
 * lugar equivocado (el texto del PDF fuente tiene un cmap de fuente no
 * estándar que hace ilegible la extracción automática, así que emparejar
 * cada casilla con su campo solo podía hacerse a mano). Ese riesgo se
 * resolvió mapeando las ~185 casillas y ~43 campos de texto del formulario
 * mediante análisis geométrico de los vectores de dibujo del PDF (no de su
 * texto) — agrupando los segmentos de línea que forman cada casilla y
 * cruzando cada coordenada resultante contra capturas numeradas del
 * formulario para verificarla — ver `officialFormCoords.ts` (los datos) y
 * la metodología documentada en §10. Con el mapa de coordenadas ya
 * verificado, superponer sobre el PDF real es estrictamente más fiel que
 * redibujar (es, literalmente, el documento oficial) y ya no carga ese
 * riesgo, porque las coordenadas fueron validadas una por una antes de
 * usarse aquí.
 */
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getInspection } from "../db/queries.js";
import { CHECKBOX_COORDS, BLANK_COORDS, SIGNATURE_COORDS, type BoxCoord, type LineCoord } from "./officialFormCoords.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_PDF_PATH = join(__dirname, "..", "..", "assets", "official-form", "2a-formulario-regional-homogenizado.pdf");

// Las coordenadas en officialFormCoords.ts están en el sistema de PyMuPDF
// (origen arriba-izquierda, Y crece hacia abajo — igual que la pantalla).
// pdf-lib usa el espacio nativo del PDF (origen abajo-izquierda, Y crece
// hacia arriba), así que toda coordenada Y debe convertirse con
// `PAGE_HEIGHT - y` antes de dibujar. Ambas páginas del formulario fuente
// son tamaño Carta (612x792pt).
const PAGE_HEIGHT = 792;
function toY(y: number): number {
  return PAGE_HEIGHT - y;
}

const INK = rgb(0.05, 0.05, 0.12);
const CHECK_COLOR = rgb(0, 0, 0);

/**
 * Dibuja una X centrada y proporcional dentro de la casilla. No usa
 * directamente las esquinas del rectángulo: la mayoría de casillas son
 * ~11x11pt (cuadradas) y ahí no hay diferencia, pero las 3 casillas de
 * color de la sección 12 (Habitable/Uso restringido/No habitable) son
 * rectángulos anchos (~31x11pt) — una X esquina-a-esquina ahí sale casi
 * plana y difícil de leer. Usar el lado más corto como base del tamaño de
 * la X, centrada en el rectángulo, da una marca clara sin importar la
 * proporción de la casilla.
 */
function drawCheck(page: PDFPage, coord: BoxCoord) {
  const { x0, y0, x1, y1 } = coord;
  const w = x1 - x0;
  const h = y1 - y0;
  const size = Math.min(w, h) * 0.72;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const half = size / 2;
  const top = toY(cy - half);
  const bottom = toY(cy + half);
  page.drawLine({ start: { x: cx - half, y: top }, end: { x: cx + half, y: bottom }, thickness: 1.3, color: CHECK_COLOR, lineCap: 1 });
  page.drawLine({ start: { x: cx + half, y: top }, end: { x: cx - half, y: bottom }, thickness: 1.3, color: CHECK_COLOR, lineCap: 1 });
}

function drawFieldText(page: PDFPage, font: PDFFont, coord: LineCoord, text: string | null | undefined) {
  if (!text) return;
  const maxWidth = coord.x1 - coord.x0 - 2;
  if (maxWidth <= 4) return;
  let size = 8;
  while (size > 5.5 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  let display = text;
  if (font.widthOfTextAtSize(display, size) > maxWidth) {
    while (display.length > 1 && font.widthOfTextAtSize(display + "…", size) > maxWidth) {
      display = display.slice(0, -1);
    }
    display += "…";
  }
  page.drawText(display, { x: coord.x0 + 1, y: toY(coord.y0) + 1.6, size, font, color: INK });
}

/** Contexto compartido para todas las funciones `mark*`/`fill*` de abajo — evita pasar `pages`/`font` en cada llamada. */
interface Ctx {
  pages: PDFPage[];
  font: PDFFont;
}
function mark(ctx: Ctx, code: string) {
  const coord = CHECKBOX_COORDS[code];
  if (!coord) return; // opción sin casilla en el formulario impreso (p.ej. 5.4 Otro) — se omite con seguridad
  drawCheck(ctx.pages[coord.page - 1], coord);
}
function fill(ctx: Ctx, code: string, text: string | null | undefined) {
  const coord = BLANK_COORDS[code];
  if (!coord) return;
  drawFieldText(ctx.pages[coord.page - 1], ctx.font, coord, text);
}
/**
 * Incrusta la imagen de una firma capturada con el dedo (dataURL PNG,
 * ver public/inspection.html) dentro de su recuadro de SIGNATURE_COORDS,
 * centrada y ajustada a proporción. Nunca lanza: una firma ilegible no debe
 * romper el resto del formulario.
 */
async function drawSignatureImage(ctx: Ctx, doc: PDFDocument, code: string, dataUrl: string | null | undefined): Promise<boolean> {
  const coord = SIGNATURE_COORDS[code];
  if (!coord || !dataUrl) return false;
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  try {
    const bytes = Buffer.from(base64, "base64");
    const img = bytes[0] === 0x89 && bytes[1] === 0x50 ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const w = coord.x1 - coord.x0;
    const h = coord.y1 - coord.y0;
    const scale = Math.min(w / img.width, h / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const page = ctx.pages[coord.page - 1];
    page.drawImage(img, {
      x: coord.x0 + (w - drawW) / 2,
      y: toY(coord.y1) + (h - drawH) / 2, // toY(y1): el borde inferior del recuadro en coordenadas nativas de pdf-lib (origen abajo-izquierda)
      width: drawW,
      height: drawH,
    });
    return true;
  } catch {
    return false; // firma ilegible/corrupta -- no rompe el resto del formulario
  }
}
/** Marca todas las casillas de un catálogo multi-selección (prefijo + código de catálogo) y, si corresponde, escribe el texto de "Otro" en su campo. */
function markCatalogMulti(ctx: Ctx, prefix: string, items: Array<{ code: string; otherText?: string }> | undefined, otherFieldCode?: string) {
  for (const it of items ?? []) {
    mark(ctx, `${prefix}.${it.code}`);
    if (it.code === "OTRO" && it.otherText && otherFieldCode) fill(ctx, otherFieldCode, it.otherText);
  }
}
function markCatalogSingle(ctx: Ctx, prefix: string, code: string | null | undefined, otherText?: string | null, otherFieldCode?: string) {
  if (!code) return;
  mark(ctx, `${prefix}.${code}`);
  if (code === "OTRO" && otherText && otherFieldCode) fill(ctx, otherFieldCode, otherText);
}

const SEVERITY_ELEMENT_CODES = [
  "COLUMNAS", "MUROS_PORTANTES", "VIGAS", "NODOS_CONEXION", "RIOSTRAS", "ENTREPISO",
  "MUROS_FACHADA_ANTEPECHOS", "MUROS_DIVISORIOS", "VENTANALES_VIDRIOS_FACHADA", "CIELO_RASO_LUMINARIAS",
  "CUBIERTAS", "ESCALERAS", "ASCENSORES", "BALCONES", "TANQUES_ELEVADOS", "INSTALACIONES_GAS",
  "INSTALACIONES_ELECTRICAS", "ACUEDUCTO_ALCANTARILLADO", "OTROS",
];

export async function buildOfficialReportPdf(inspectionId: string): Promise<Uint8Array> {
  const insp = getInspection(inspectionId) as any;
  if (!insp) throw new Error(`Inspección no encontrada: ${inspectionId}`);
  if (!existsSync(SOURCE_PDF_PATH)) throw new Error(`No se encontró el formulario oficial fuente en ${SOURCE_PDF_PATH}`);

  const srcBytes = readFileSync(SOURCE_PDF_PATH);
  const pdfDoc = await PDFDocument.load(srcBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const ctx: Ctx = { pages, font };

  // =========================================================================
  // Encabezado / identificación general
  // =========================================================================
  fill(ctx, "formNumber", insp.form_number);
  fill(ctx, "zoneId", insp.zone_id);

  // --- 1. Identificación de la evaluación ---
  fill(ctx, "evaluatorName", insp.evaluator_name);
  fill(ctx, "inspectionDate", insp.inspection_date);
  fill(ctx, "inspectionTime", insp.inspection_time);
  if (insp.inspection_time_period === "am") mark(ctx, "inspectionTimePeriod.am");
  if (insp.inspection_time_period === "pm") mark(ctx, "inspectionTimePeriod.pm");
  fill(ctx, "groupId", insp.group_id);
  fill(ctx, "entity", insp.entity);
  fill(ctx, "contactPerson", insp.contact_person);
  fill(ctx, "contactPhone", insp.contact_phone);
  markCatalogMulti(ctx, "threat", insp.threatTypes, "threatOtherText");

  // --- 2. Clasificación de habitabilidad y nivel de daño ---
  if (insp.inspection_type === "EXTERIOR") mark(ctx, "inspectionType.EXTERIOR");
  if (insp.inspection_type === "COMPLETA") mark(ctx, "inspectionType.COMPLETA");
  markCatalogSingle(ctx, "habitability", insp.habitability);
  markCatalogSingle(ctx, "damageLevel", insp.damage_level);

  // --- 3. Información general ---
  fill(ctx, "department", insp.department);
  fill(ctx, "municipality", insp.municipality);
  fill(ctx, "neighborhood", insp.neighborhood);
  if (insp.area_type === "URBANO") mark(ctx, "areaType.URBANO");
  if (insp.area_type === "RURAL") mark(ctx, "areaType.RURAL");
  fill(ctx, "longitude", insp.longitude != null ? String(insp.longitude) : null);
  fill(ctx, "latitude", insp.latitude != null ? String(insp.latitude) : null);

  // --- 4. Identificación de la edificación ---
  fill(ctx, "address", insp.address);
  fill(ctx, "buildingName", insp.building_name);
  markCatalogMulti(ctx, "use", insp.buildingUses, "useOtherText");
  fill(ctx, "floorsAboveGround", insp.floors_above_ground != null ? String(insp.floors_above_ground) : null);
  fill(ctx, "basements", insp.basements != null ? String(insp.basements) : null);
  if (insp.building_ownership === "PUBLICA") mark(ctx, "buildingOwnership.PUBLICA");
  if (insp.building_ownership === "PRIVADA") mark(ctx, "buildingOwnership.PRIVADA");
  fill(ctx, "frontDimension", insp.front_dimension != null ? String(insp.front_dimension) : null);
  fill(ctx, "depthDimension", insp.depth_dimension != null ? String(insp.depth_dimension) : null);

  // --- 5. Sistema estructural, entrepiso y cubierta ---
  markCatalogMulti(ctx, "struct", insp.structuralSystems, "structuralSystemOtherText");
  markCatalogMulti(ctx, "floor", insp.floorSystems, "floorSystemOtherText");
  markCatalogMulti(ctx, "roofsup", insp.roofSupportSystems, "roofSupportOtherText");
  // 5.4 Tipo de cubierta: el formulario impreso no tiene casilla "Otro" (ver
  // docs/ANALISIS-Y-ARQUITECTURA.md) — markCatalogMulti omite con seguridad
  // cualquier código sin coordenada, así que un "Otro" elegido en la app
  // simplemente no deja marca aquí (no hay dónde marcarla en el original).
  markCatalogMulti(ctx, "roof", insp.roofTypes);

  // --- 6. Condiciones preexistentes y de entorno ---
  markCatalogSingle(ctx, "morph", insp.site_morphology, insp.site_morphology_other, "siteMorphologyOtherText");
  if (insp.water_body_threat === 1) mark(ctx, "waterBodyThreat.SI");
  if (insp.water_body_threat === 0) mark(ctx, "waterBodyThreat.NO");
  fill(ctx, "waterBodyDistance", insp.water_body_distance != null ? String(insp.water_body_distance) : null);
  fill(ctx, "waterBodyNotes", insp.water_body_notes);
  if (insp.weak_story === 1) mark(ctx, "weakStory.SI");
  if (insp.weak_story === 0) mark(ctx, "weakStory.NO");
  if (insp.short_column === 1) mark(ctx, "shortColumn.SI");
  if (insp.short_column === 0) mark(ctx, "shortColumn.NO");
  if (insp.stiffness_change === 1) mark(ctx, "stiffnessChange.SI");
  if (insp.stiffness_change === 0) mark(ctx, "stiffnessChange.NO");

  // --- 7. Peligro global · 8. Peligro por condiciones geotécnicas ---
  markCatalogSingle(ctx, "totalCollapse", insp.total_collapse);
  markCatalogSingle(ctx, "partialCollapse", insp.partial_collapse);
  markCatalogSingle(ctx, "evidentTilt", insp.evident_tilt);
  markCatalogSingle(ctx, "adjacentBuildingRisk", insp.adjacent_building_risk);
  markCatalogSingle(ctx, "soilLiquefaction", insp.soil_liquefaction);
  markCatalogSingle(ctx, "nearbyLandslides", insp.nearby_landslides);

  // --- 9 y 10. Peligro por daño en elementos (estructurales + no estructurales) ---
  const damagesByCode = new Map<string, string>();
  for (const d of (insp.elementDamages as any[]) ?? []) damagesByCode.set(d.element_code, d.severity);
  for (const code of SEVERITY_ELEMENT_CODES) {
    const sev = damagesByCode.get(code);
    if (sev) mark(ctx, `sev.${code}.${sev}`);
  }
  const otrosDamage = (insp.elementDamages as any[])?.find((d) => d.element_code === "OTROS");
  if (otrosDamage?.other_label) fill(ctx, "nonStructOtherText", otrosDamage.other_label);

  // --- 12. Clasificación de habitabilidad y del daño (repetición) + evaluación previa ---
  markCatalogSingle(ctx, "habitability2", insp.habitability);
  markCatalogSingle(ctx, "damageLevel2", insp.damage_level);
  if (insp.previous_evaluation_exists === 1) mark(ctx, "previousEvaluationExists.SI");
  if (insp.previous_evaluation_exists === 0) mark(ctx, "previousEvaluationExists.NO");
  if (insp.previous_evaluation_exists) {
    fill(ctx, "previousEvaluationType", insp.previous_evaluation_type);
    fill(ctx, "previousEvaluationEntity", insp.previous_evaluation_entity);
    fill(ctx, "previousEvaluationHabitability", insp.previous_evaluation_habitability);
    fill(ctx, "previousEvaluationDate", insp.previous_evaluation_date);
  }

  // --- 13. Ocupación de la edificación ---
  if (insp.occupation_status === "OCUPADA") mark(ctx, "occupationStatus.OCUPADA");
  if (insp.occupation_status === "DESOCUPADA") mark(ctx, "occupationStatus.DESOCUPADA");

  // --- 14. Recomendaciones y medidas de seguridad ---
  markCatalogMulti(ctx, "reco", insp.safetyRecommendations, "recoOtherText");

  // --- 15. Comentarios finales --- (el formulario impreso solo trae 4 líneas
  // subrayadas sin casilla de texto delimitada; se usa la primera como ancla
  // y se deja que pdf-lib recorte/reduzca tamaño vía drawFieldText — un
  // comentario largo se trunca con "…", igual que cualquier otro campo).
  // No hay coordenada de "comentarios" en el mapa (el original es multilínea
  // libre, no una sola casilla) — se omite intencionalmente aquí; el detalle
  // completo de comentarios queda en el informe rediseñado (`report.pdf`).

  // --- 16. Información del evaluador ---
  fill(ctx, "evaluatorName2", insp.evaluator_name);
  fill(ctx, "evaluatorIdCode", insp.evaluator_id_code);
  if (insp.evaluator_doc_type === "CC") mark(ctx, "evaluatorDocType.CC");
  if (insp.evaluator_doc_type === "PASAPORTE") mark(ctx, "evaluatorDocType.PASAPORTE");
  fill(ctx, "evaluatorDocNumber", insp.evaluator_doc_number);
  fill(ctx, "evaluatorEntity", insp.evaluator_entity);
  fill(ctx, "evaluatorDependencia", insp.evaluator_dependencia);
  // Línea de firma del evaluador: se incrusta la firma real capturada con el
  // dedo (ver public/inspection.html) si existe; si todavía no se firmó, se
  // escribe el nombre como mejor esfuerzo (más útil que dejarlo en blanco),
  // igual convención que usa el resto de la industria de formularios
  // diligenciados digitalmente sin firma electrónica real.
  const evaluatorSigned = await drawSignatureImage(ctx, pdfDoc, "inspectorSignatureImage", insp.inspector_signature);
  if (!evaluatorSigned) fill(ctx, "evaluatorSignatureLine", insp.evaluator_name);
  fill(ctx, "responsibleOfficialSignatureLine", insp.responsible_official_name);
  fill(ctx, "responsibleOfficialCc", insp.responsible_official_cc);
  fill(ctx, "responsibleOfficialEntity", insp.responsible_official_entity);

  // Firma del propietario/ocupante: el formulario original NO tiene un
  // campo para esto (solo evaluador y "funcionario responsable") -- a
  // pedido explícito se agrega igual, en el espacio en blanco real que
  // queda dentro del recuadro de la sección 16 (ver SIGNATURE_COORDS). Se
  // dibuja una etiqueta propia (no impresa en el original) para que quede
  // claro que es un agregado de la app, no parte del formulario fuente.
  if (insp.occupant_signature) {
    const coord = SIGNATURE_COORDS.occupantSignatureImage;
    const page = ctx.pages[coord.page - 1];
    // Verticalmente centrada frente al recuadro de la firma (a su izquierda).
    page.drawText("Firma propietario/", { x: 42, y: toY((coord.y0 + coord.y1) / 2) + 2, size: 6.5, font, color: rgb(0.4, 0.44, 0.52) });
    page.drawText("ocupante:", { x: 42, y: toY((coord.y0 + coord.y1) / 2) - 6, size: 6.5, font, color: rgb(0.4, 0.44, 0.52) });
    await drawSignatureImage(ctx, pdfDoc, "occupantSignatureImage", insp.occupant_signature);
  }

  return pdfDoc.save();
}
