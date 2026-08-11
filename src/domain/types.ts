/**
 * Tipos de dominio — Formulario Regional para Evaluación Rápida de Daños en
 * Edificaciones (Sistema Nacional de Gestión del Riesgo de Desastres /
 * USAID / Miyamoto International, V.1.0 - 03/2023).
 *
 * Deliberadamente sin dependencias de framework/BD (ni Prisma, ni SQLite, ni
 * `node:http`), igual que `src/wabim/types.ts` en el proyecto de referencia
 * `wabim-bridges`, para que este módulo sea portable sin cambios a la
 * arquitectura objetivo (Next.js/NestJS + PostgreSQL) — ver
 * docs/ANALISIS-Y-ARQUITECTURA.md, §4.
 *
 * Cada tipo referencia la sección del formulario de la que proviene.
 */

// ---------------------------------------------------------------------------
// Escalas y enumeraciones cerradas del formulario
// ---------------------------------------------------------------------------

/** Escala de severidad de las secciones 9 y 10: N/L = Ninguno/Leve, M = Moderado, S = Severo. */
export type ElementSeverity = "NL" | "M" | "S";

/** Semáforo de habitabilidad (secciones 2/12). */
export type HabitabilityColor = "VERDE" | "AMARILLO" | "ROJO";

/** Nivel de daño (secciones 2/12), acompaña siempre al semáforo de habitabilidad. */
export type DamageLevel = "NINGUNO_MENOR" | "MODERADO" | "SEVERO";

/** Sí/No simple (usado en varios campos de peligro). */
export type YesNo = "SI" | "NO";

/** Sí/No/No es claro — usado en colapso parcial y riesgo por edificaciones adyacentes (sección 7). */
export type TriState = "SI" | "NO" | "NO_ES_CLARO";

export type InspectionType = "EXTERIOR" | "COMPLETA"; // sección 2
export type AreaType = "URBANO" | "RURAL"; // sección 3
export type BuildingOwnership = "PUBLICA" | "PRIVADA"; // sección 4
export type OccupationStatus = "OCUPADA" | "DESOCUPADA"; // sección 13
export type EvaluatorDocumentType = "CC" | "PASAPORTE"; // sección 16

/** Estado de trabajo de la inspección dentro de la app (no es un campo del formulario impreso). */
export type InspectionStatus = "BORRADOR" | "EN_PROCESO" | "FINALIZADA" | "INFORME_GENERADO";

export type ElementCategory = "ESTRUCTURAL" | "NO_ESTRUCTURAL"; // secciones 9 / 10

/**
 * Criticidad del elemento para efectos de semaforización de la casilla M/S
 * (ver formulario impreso: Columnas/Muros portantes/Nodos/Riostras se pintan
 * en rojo ante M o S; Vigas/Entrepiso y todo lo no estructural se pintan en
 * amarillo). Ver docs/ANALISIS-Y-ARQUITECTURA.md §3 ambigüedad A2.
 */
export type ElementTier = "CRITICO" | "SECUNDARIO";

// ---------------------------------------------------------------------------
// Catálogo (listas cerradas del formulario — código + etiqueta)
// ---------------------------------------------------------------------------

export interface CatalogOption {
  code: string;
  label: string;
  /** Agrupador visual del formulario, p.ej. "Concreto reforzado", "Mampostería". */
  group?: string;
  /** Si true, seleccionar esta opción revela un campo de texto libre "¿Cuál?". */
  allowOther?: boolean;
}

export interface StructuralElementDef {
  code: string;
  name: string;
  category: ElementCategory;
  tier: ElementTier;
}

// ---------------------------------------------------------------------------
// Registro de daño por elemento (secciones 9 y 10 del formulario — checklist oficial)
// ---------------------------------------------------------------------------

export interface ElementDamageInput {
  id: string;
  elementCode: string;
  category: ElementCategory;
  severity: ElementSeverity;
  /** Solo aplica al elemento "OTROS" de la sección 10. */
  otherLabel?: string;
}

// ---------------------------------------------------------------------------
// Registro de daño individual — EXTENSIÓN aditiva no presente en el formulario
// impreso, pedida explícitamente en los requerimientos funcionales (fotos +
// descripción por daño). Cuelga de un elemento ya definido por el formulario;
// no introduce categorías de daño nuevas. Ver docs/ANALISIS-Y-ARQUITECTURA.md §3, A4.
// ---------------------------------------------------------------------------

export interface DamageRecordInput {
  id: string;
  elementDamageId?: string | null;
  elementLabel: string;
  location?: string;
  damageType?: string;
  description?: string;
  severity?: ElementSeverity;
  extent?: string;
  recommendation?: string;
  notes?: string;
  photoIds: string[];
}

// ---------------------------------------------------------------------------
// Motor de sugerencia de clasificación (equivalente, para esta app, al motor
// de cálculo puro de wabim-bridges) — ver src/domain/classification.ts
// ---------------------------------------------------------------------------

export interface ClassificationInput {
  totalCollapse: YesNo | null;
  partialCollapse: TriState | null;
  evidentTilt: YesNo | null;
  adjacentBuildingRisk: TriState | null;
  soilLiquefaction: YesNo | null;
  nearbyLandslides: YesNo | null;
  elementDamages: ElementDamageInput[];
}

export interface ClassificationSuggestion {
  habitability: HabitabilityColor;
  damageLevel: DamageLevel;
  /** Traza legible de qué disparó la sugerencia — igual espíritu que los "steps" de wabim-bridges. */
  reasons: string[];
}
