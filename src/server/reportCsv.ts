/**
 * Exportación CSV de una inspección — información estructurada (sección 15
 * del encargo: "evaluar la posibilidad de generar Excel/CSV" además del PDF).
 * Sin dependencias externas: un CSV simple, delimitado por comas, con escape
 * RFC 4180, abre directamente en Excel/Sheets/LibreOffice.
 */
import { getInspection } from "../db/queries.js";
import { THREAT_TYPES, BUILDING_USES, STRUCTURAL_SYSTEMS, ROOF_TYPES, SAFETY_RECOMMENDATIONS, getElementDef } from "../domain/catalog.js";
import type { CatalogOption } from "../domain/types.js";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function row(cells: unknown[]): string {
  return cells.map(csvEscape).join(",") + "\r\n";
}
function labelFor(list: CatalogOption[], code: string | null | undefined): string {
  if (!code) return "";
  return list.find((o) => o.code === code)?.label ?? code;
}
function labelList(list: CatalogOption[], items: Array<{ code: string; otherText?: string }> | undefined): string {
  if (!items?.length) return "";
  return items.map((it) => (it.code === "OTRO" && it.otherText ? `Otro: ${it.otherText}` : labelFor(list, it.code))).join(" | ");
}

export function buildInspectionReportCsv(inspectionId: string): string {
  const insp = getInspection(inspectionId) as any;
  if (!insp) throw new Error(`Inspección no encontrada: ${inspectionId}`);

  let csv = "";
  csv += row(["Formulario Regional para Evaluación Rápida de Daños en Edificaciones"]);
  csv += row(["Sección", "Campo", "Valor"]);

  const kv = (section: string, pairs: Array<[string, unknown]>) => {
    for (const [label, value] of pairs) csv += row([section, label, value]);
  };

  kv("1. Identificación", [
    ["No. de formulario", insp.form_number],
    ["ID Zona", insp.zone_id],
    ["Nombre del evaluador", insp.evaluator_name],
    ["Fecha", insp.inspection_date],
    ["Hora", `${insp.inspection_time ?? ""} ${insp.inspection_time_period ?? ""}`.trim()],
    ["Entidad", insp.entity],
    ["Tipo de amenaza", (insp.threatTypes ?? []).map((t: any) => labelFor(THREAT_TYPES, t.code)).join(" | ")],
  ]);
  kv("Víctimas y afectación humana", [
    ["Muertos", insp.num_deaths],
    ["Heridos", insp.num_injured],
    ["Desaparecidos", insp.num_missing],
    ["Damnificados", insp.num_affected],
    ["Observaciones", insp.victims_notes],
  ]);
  kv("2/12. Clasificación", [
    ["Habitabilidad", insp.habitability],
    ["Nivel de daño", insp.damage_level],
  ]);
  kv("3. Localización", [
    ["Departamento", insp.department],
    ["Municipio", insp.municipality],
    ["Barrio/Vereda", insp.neighborhood],
    ["Zona", insp.area_type],
    ["Latitud", insp.latitude],
    ["Longitud", insp.longitude],
  ]);
  kv("4. Edificación", [
    ["Dirección", insp.address],
    ["Nombre", insp.building_name],
    ["Uso", (insp.buildingUses ?? []).map((u: any) => labelFor(BUILDING_USES, u.code)).join(" | ")],
    ["Pisos sobre el suelo", insp.floors_above_ground],
    ["Sótanos", insp.basements],
    ["Tipo", insp.building_ownership],
  ]);
  kv("5. Sistema estructural", [
    ["5.1 Sistema estructural", (insp.structuralSystems ?? []).map((s: any) => labelFor(STRUCTURAL_SYSTEMS, s.code)).join(" | ")],
    ["5.4 Tipo de cubierta", labelList(ROOF_TYPES, insp.roofTypes)],
  ]);
  kv("7-8. Peligros", [
    ["Colapso total", insp.total_collapse],
    ["Colapso parcial", insp.partial_collapse],
    ["Inclinación evidente", insp.evident_tilt],
    ["Riesgo edif. adyacentes", insp.adjacent_building_risk],
    ["Licuación/asentamiento", insp.soil_liquefaction],
    ["Movimientos en masa cercanos", insp.nearby_landslides],
  ]);

  csv += row([]);
  csv += row(["9-10. Daño por elemento", "Categoría", "Elemento", "Severidad"]);
  for (const d of insp.elementDamages ?? []) {
    csv += row(["", d.category, getElementDef(d.element_code)?.name ?? d.element_code, d.severity]);
  }

  csv += row([]);
  csv += row(["Detalle de daños (extensión)", "Elemento", "Ubicación", "Tipo de daño", "Descripción", "Severidad", "Extensión", "Recomendación", "# Fotos"]);
  for (const d of insp.damageRecords ?? []) {
    csv += row(["", d.element_label, d.location, d.damage_type, d.description, d.severity, d.extent, d.recommendation, d.photos?.length ?? 0]);
  }

  csv += row([]);
  kv("13-14. Ocupación y recomendaciones", [
    ["Ocupación", insp.occupation_status],
    ["Recomendaciones", (insp.safetyRecommendations ?? []).map((r: any) => labelFor(SAFETY_RECOMMENDATIONS, r.code)).join(" | ")],
  ]);
  kv("15. Comentarios", [["Comentarios finales", insp.final_comments]]);
  kv("16. Evaluador", [
    ["Nombre", insp.evaluator_name],
    ["ID Evaluador", insp.evaluator_id_code],
    ["Documento", `${insp.evaluator_doc_type ?? ""} ${insp.evaluator_doc_number ?? ""}`.trim()],
    ["Entidad", insp.evaluator_entity],
  ]);

  return "﻿" + csv; // BOM para que Excel detecte UTF-8 correctamente
}
