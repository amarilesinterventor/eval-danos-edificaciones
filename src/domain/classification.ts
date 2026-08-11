/**
 * Motor de sugerencia de clasificación de habitabilidad y nivel de daño
 * (secciones 2/12 del formulario — ver docs/ANALISIS-Y-ARQUITECTURA.md §3, A1).
 *
 * El formulario fuente no define una fórmula explícita que derive el semáforo
 * final a partir de las casillas de peligro (secciones 7, 8, 9, 10): en
 * metodologías de evaluación visual rápida tipo ATC-20, esa es una decisión de
 * juicio del inspector, informada — no determinada mecánicamente — por esos
 * indicadores. Este motor produce una SUGERENCIA con traza legible de qué la
 * disparó; el inspector siempre puede aceptarla o cambiarla en la UI (ver
 * `suggested` vs. el valor final guardado en `inspections.habitability` /
 * `inspections.damage_level`).
 *
 * Puro, sin dependencias de framework/BD — mismo principio de diseño que
 * `wabim-bridges/src/wabim/engine.ts`.
 */
import type { ClassificationInput, ClassificationSuggestion, DamageLevel, ElementSeverity, HabitabilityColor } from "./types.js";
import { getElementDef } from "./catalog.js";

const SEVERITY_RANK: Record<ElementSeverity, number> = { NL: 0, M: 1, S: 2 };
const SEVERITY_LABEL: Record<ElementSeverity, string> = { NL: "Ninguno/Leve", M: "Moderado", S: "Severo" };

const HABITABILITY_ORDER: HabitabilityColor[] = ["VERDE", "AMARILLO", "ROJO"];
const HABITABILITY_RANK: Record<HabitabilityColor, number> = { VERDE: 0, AMARILLO: 1, ROJO: 2 };

export function suggestClassification(input: ClassificationInput): ClassificationSuggestion {
  const reasons: string[] = [];
  // Se acumula como rango numérico (no como el propio HabitabilityColor) para
  // evitar que TypeScript, al ver la variable reasignada dentro del closure
  // `escalate`, deje de refinar su tipo en comparaciones posteriores.
  let habitabilityRank = 0;

  const escalate = (level: HabitabilityColor, reason: string) => {
    habitabilityRank = Math.max(habitabilityRank, HABITABILITY_RANK[level]);
    reasons.push(reason);
  };

  // --- Peligro global (sección 7) y geotécnico (sección 8) ---
  if (input.totalCollapse === "SI") escalate("ROJO", "Colapso total = Sí (sección 7)");
  if (input.evidentTilt === "SI") escalate("ROJO", "Inclinación evidente = Sí (sección 7)");
  if (input.soilLiquefaction === "SI") escalate("ROJO", "Licuación/asentamiento/subsidencia del terreno = Sí (sección 8)");
  if (input.nearbyLandslides === "SI") escalate("ROJO", "Movimientos en masa cercanos = Sí (sección 8)");

  if (input.partialCollapse === "SI") escalate("AMARILLO", "Colapso parcial = Sí (sección 7)");
  else if (input.partialCollapse === "NO_ES_CLARO") escalate("AMARILLO", "Colapso parcial = No es claro (sección 7) — requiere evaluación adicional");

  if (input.adjacentBuildingRisk === "SI") escalate("AMARILLO", "Riesgo por edificaciones adyacentes = Sí (sección 7)");
  else if (input.adjacentBuildingRisk === "NO_ES_CLARO") escalate("AMARILLO", "Riesgo por edificaciones adyacentes = No es claro (sección 7)");

  // --- Daño en elementos estructurales y no estructurales (secciones 9-10) ---
  let maxSeverity: ElementSeverity = "NL";
  for (const dmg of input.elementDamages) {
    if (SEVERITY_RANK[dmg.severity] > SEVERITY_RANK[maxSeverity]) maxSeverity = dmg.severity;
    const def = getElementDef(dmg.elementCode);
    const tier = def?.tier ?? "SECUNDARIO";
    const name = def?.name ?? dmg.elementCode;
    if (dmg.severity === "S") {
      if (tier === "CRITICO") escalate("ROJO", `${name}: severidad Severo en elemento crítico (sección 9)`);
      else escalate("AMARILLO", `${name}: severidad Severo (secciones 9/10)`);
    } else if (dmg.severity === "M" && tier === "CRITICO") {
      escalate("AMARILLO", `${name}: severidad Moderado en elemento crítico (sección 9)`);
    }
  }

  if (reasons.length === 0) reasons.push("Sin indicadores de peligro marcados — se sugiere Habitable (Verde).");

  const habitability: HabitabilityColor = HABITABILITY_ORDER[habitabilityRank];

  // --- Nivel de daño: severidad máxima observada, con piso de consistencia ---
  // con la habitabilidad sugerida (si se sugiere Rojo/Amarillo por colapso o
  // geotecnia, el nivel de daño no puede quedar en "Ninguno/Menor" aunque no
  // se hayan diligenciado las secciones 9/10 con el mismo detalle).
  let damageLevel: DamageLevel = maxSeverity === "S" ? "SEVERO" : maxSeverity === "M" ? "MODERADO" : "NINGUNO_MENOR";
  if (habitabilityRank === HABITABILITY_RANK.ROJO && damageLevel !== "SEVERO") damageLevel = "SEVERO";
  if (habitabilityRank === HABITABILITY_RANK.AMARILLO && damageLevel === "NINGUNO_MENOR") damageLevel = "MODERADO";

  if (maxSeverity !== "NL") reasons.push(`Severidad máxima registrada en elementos: ${SEVERITY_LABEL[maxSeverity]}.`);

  return { habitability, damageLevel, reasons };
}
