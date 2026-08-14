/**
 * Catálogos cerrados del Formulario Regional para Evaluación Rápida de Daños
 * en Edificaciones (V.1.0 - 03/2023). Cada lista corresponde 1:1 a las
 * casillas impresas del formulario — ver docs/ANALISIS-Y-ARQUITECTURA.md §1
 * para la transcripción completa por sección.
 *
 * A diferencia del catálogo WABIM de referencia (`wabim-bridges/src/wabim/catalog.ts`),
 * aquí no hay coeficientes numéricos que un administrador deba recalibrar: son
 * listas cerradas de un formulario oficial, así que viven como datos
 * estáticos versionados en código, no en tablas editables de la base de datos.
 */
import type { CatalogOption, StructuralElementDef } from "./types.js";

// --- Sección 1 — Tipo de amenaza --------------------------------------------
export const THREAT_TYPES: CatalogOption[] = [
  { code: "AVENIDA_TORRENCIAL", label: "Avenida torrencial" },
  { code: "ERUPCION_VOLCANICA", label: "Erupción volcánica" },
  { code: "INCENDIO_ESTRUCTURAL", label: "Incendio estructural" },
  { code: "INUNDACION", label: "Inundación" },
  { code: "MOVIMIENTO_EN_MASA", label: "Movimiento en masa" },
  { code: "SISMO", label: "Sismo" },
  { code: "VENDAVAL", label: "Vendaval" },
  { code: "OTRO", label: "Otro", allowOther: true },
];

// --- Sección 4 — Uso de la edificación (multi-selección: puede ser mixto) --
export const BUILDING_USES: CatalogOption[] = [
  { code: "RESIDENCIAL", label: "Residencial" },
  { code: "COMERCIAL", label: "Comercial" },
  { code: "EDUCACIONAL", label: "Educacional" },
  { code: "SALUD", label: "Salud" },
  { code: "HOTELERO", label: "Hotelero" },
  { code: "OFICINAS", label: "Oficinas" },
  { code: "INSTITUCIONAL", label: "Institucional" },
  { code: "INDUSTRIAL", label: "Industrial" },
  { code: "BODEGAS", label: "Bodegas" },
  { code: "ESTACIONAMIENTOS", label: "Estacionamientos" },
  { code: "OTRO", label: "Otro", allowOther: true },
];

// --- Sección 5.1 — Sistema estructural --------------------------------------
export const STRUCTURAL_SYSTEMS: CatalogOption[] = [
  { code: "PORTICOS", label: "Pórticos", group: "Concreto reforzado" },
  { code: "MUROS_ESTRUCTURALES", label: "Muros estructurales", group: "Concreto reforzado" },
  { code: "SISTEMA_DUAL_COMBINADO", label: "Sistema dual o combinado", group: "Concreto reforzado" },
  { code: "PREFABRICADO", label: "Prefabricado", group: "Concreto reforzado" },
  { code: "MAMPOSTERIA_CONFINADA", label: "Mampostería confinada", group: "Mampostería" },
  { code: "MAMPOSTERIA_REFORZADA", label: "Mampostería reforzada", group: "Mampostería" },
  { code: "MAMPOSTERIA_SIMPLE", label: "Mampostería simple", group: "Mampostería" },
  { code: "PORTICOS_ARRIOSTRADOS", label: "Pórticos arriostrados", group: "Acero" },
  { code: "PORTICOS_NO_ARRIOSTRADOS", label: "Pórticos no arriostrados", group: "Acero" },
  { code: "ESTRUCTURA_MADERA", label: "Estructura en madera", group: "Madera" },
  { code: "ESTRUCTURA_GUADUA", label: "Estructura en guadua", group: "Madera" },
  { code: "MUROS_BAHAREQUE", label: "Muros en bahareque", group: "Bahareque o tapia" },
  { code: "MUROS_TAPIA", label: "Muros en tapia", group: "Bahareque o tapia" },
  { code: "MIXTO", label: "Mixto", group: "Otros" },
  { code: "NINGUNO", label: "Ninguno", group: "Otros" },
  { code: "OTRO", label: "Otro", group: "Otros", allowOther: true },
];

// --- Sección 5.2 — Sistema de entrepiso -------------------------------------
export const FLOOR_SYSTEMS: CatalogOption[] = [
  { code: "ENTREPISO_PLACA_MACIZA", label: "Placa maciza", group: "Concreto reforzado" },
  { code: "ENTREPISO_PLACA_ALIGERADA", label: "Placa aligerada", group: "Concreto reforzado" },
  { code: "ENTREPISO_STEELDECK", label: "Steeldeck", group: "Acero" },
  { code: "ENTREPISO_VIGAS_CON_CONECTORES", label: "Vigas con conectores", group: "Acero" },
  { code: "ENTREPISO_VIGAS_SIN_CONECTORES", label: "Vigas sin conectores", group: "Acero" },
  { code: "ENTREPISO_VIGAS_MADERA", label: "Vigas", group: "Madera" },
  { code: "ENTREPISO_CERCHAS_MADERA", label: "Cerchas", group: "Madera" },
  { code: "ENTREPISO_MIXTO", label: "Mixto", group: "Otro" },
  { code: "ENTREPISO_OTRO", label: "Otro", group: "Otro", allowOther: true },
];

// --- Sección 5.3 — Sistema de soporte de la cubierta ------------------------
export const ROOF_SUPPORT_SYSTEMS: CatalogOption[] = [
  { code: "CUBIERTA_VIGAS_CONCRETO", label: "Vigas de concreto", group: "Concreto reforzado" },
  { code: "CUBIERTA_PLACA_MACIZA_ALIGERADA", label: "Placa maciza / aligerada", group: "Concreto reforzado" },
  { code: "CUBIERTA_VIGAS_ACERO", label: "Vigas de acero", group: "Acero" },
  { code: "CUBIERTA_CERCHAS_ACERO", label: "Cerchas de acero", group: "Acero" },
  { code: "CUBIERTA_VIGAS_MADERA", label: "Vigas de madera", group: "Madera" },
  { code: "CUBIERTA_CERCHAS_MADERA", label: "Cerchas de madera", group: "Madera" },
  { code: "CUBIERTA_OTRO", label: "Otro", group: "Otro", allowOther: true },
];

// --- Sección 5.4 — Tipo de cubierta -----------------------------------------
// "Otro" agregado a solicitud del usuario: el formulario impreso no lo dibuja
// explícitamente en 5.4, pero sí lo hace en el resto de la sección 5 (5.1-5.3)
// — se completa por consistencia con el resto del formulario.
export const ROOF_TYPES: CatalogOption[] = [
  { code: "TEJA_ZINC", label: "Teja de zinc" },
  { code: "TEJA_BARRO", label: "Teja de barro" },
  { code: "TEJA_FIBROCEMENTO", label: "Teja de fibrocemento" },
  { code: "TEJA_PLASTICA", label: "Teja plástica" },
  { code: "PLASTICO_PAJA", label: "Plástico-paja" },
  { code: "STANDING_SEAM", label: "Standing Seam" },
  { code: "OTRO", label: "Otro", allowOther: true },
];

// --- Sección 6.1 — Morfología del sitio (selección única) -------------------
export const SITE_MORPHOLOGY: CatalogOption[] = [
  { code: "DIVISORIA", label: "Divisoria" },
  { code: "LADERA", label: "Ladera" },
  { code: "PIE_DE_LADERA", label: "Pie de ladera" },
  { code: "VALLE", label: "Valle" },
  { code: "BORDE_DE_RIO", label: "Borde de río" },
  { code: "TALUD", label: "Talud" },
  { code: "OTRO", label: "Otro", allowOther: true },
];

// --- Sección 9 — Elementos estructurales (con criticidad para semaforización) --
// Columnas / Muros portantes / Nodos / Riostras se pintan en rojo ante M o S en
// el formulario impreso (comprometen la estabilidad global); Vigas y Entrepiso
// se pintan en amarillo (más margen). Ver docs/ANALISIS-Y-ARQUITECTURA.md §1.
export const STRUCTURAL_ELEMENTS: StructuralElementDef[] = [
  { code: "COLUMNAS", name: "Columnas", category: "ESTRUCTURAL", tier: "CRITICO" },
  { code: "MUROS_PORTANTES", name: "Muros portantes", category: "ESTRUCTURAL", tier: "CRITICO" },
  { code: "VIGAS", name: "Vigas", category: "ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "NODOS_CONEXION", name: "Nodos o puntos de conexión", category: "ESTRUCTURAL", tier: "CRITICO" },
  { code: "RIOSTRAS", name: "Riostras", category: "ESTRUCTURAL", tier: "CRITICO" },
  { code: "ENTREPISO", name: "Entrepiso", category: "ESTRUCTURAL", tier: "SECUNDARIO" },
];

// --- Sección 10 — Elementos no estructurales --------------------------------
// Esquema uniforme SECUNDARIO (verde/amarillo/amarillo) para las 12 filas —
// ver ambigüedad A2 en docs/ANALISIS-Y-ARQUITECTURA.md: la resolución de la
// imagen del formulario no permitió confirmar con certeza absoluta variaciones
// fila por fila; un ingeniero estructural debería validar esta asignación.
export const NON_STRUCTURAL_ELEMENTS: StructuralElementDef[] = [
  { code: "MUROS_FACHADA_ANTEPECHOS", name: "Muros de fachada/antepechos", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "MUROS_DIVISORIOS", name: "Muros divisorios", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "VENTANALES_VIDRIOS_FACHADA", name: "Ventanales/vidrios de fachada", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "CIELO_RASO_LUMINARIAS", name: "Cielo raso/luminarias", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "CUBIERTAS", name: "Cubiertas", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "ESCALERAS", name: "Escaleras", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "ASCENSORES", name: "Ascensores", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "BALCONES", name: "Balcones", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "TANQUES_ELEVADOS", name: "Tanques elevados", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "INSTALACIONES_GAS", name: "Instalaciones de gas", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "INSTALACIONES_ELECTRICAS", name: "Instalaciones eléctricas", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "ACUEDUCTO_ALCANTARILLADO", name: "Acueducto y alcantarillado", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
  { code: "OTROS", name: "Otros", category: "NO_ESTRUCTURAL", tier: "SECUNDARIO" },
];

export const ALL_ELEMENTS: StructuralElementDef[] = [...STRUCTURAL_ELEMENTS, ...NON_STRUCTURAL_ELEMENTS];

export function getElementDef(code: string): StructuralElementDef | undefined {
  return ALL_ELEMENTS.find((e) => e.code === code);
}

// --- Sección 14 — Recomendaciones y medidas de seguridad --------------------
export const SAFETY_RECOMMENDATIONS: CatalogOption[] = [
  { code: "EVAL_ADICIONAL_ESTRUCTURAL", label: "Evaluación adicional: Estructural", group: "Evaluación adicional" },
  { code: "EVAL_ADICIONAL_GEOTECNICA", label: "Evaluación adicional: Geotécnica", group: "Evaluación adicional" },
  { code: "EVAL_ADICIONAL_EMPRESA_SERVICIOS", label: "Evaluación adicional: Empresa prestadora de servicios públicos", group: "Evaluación adicional" },
  { code: "EVACUAR_EDIFICACION", label: "Evacuar edificación", group: "Evacuación" },
  { code: "EVACUAR_EDIFICACIONES_ALEDANAS", label: "Evacuar edificaciones aledañas", group: "Evacuación" },
  { code: "DESCONECTAR_ENERGIA", label: "Desconectar servicio: Energía", group: "Desconectar servicios" },
  { code: "DESCONECTAR_AGUA", label: "Desconectar servicio: Agua", group: "Desconectar servicios" },
  { code: "DESCONECTAR_GAS", label: "Desconectar servicio: Gas", group: "Desconectar servicios" },
  { code: "APUNTALAR", label: "Apuntalar", group: "Medidas físicas" },
  { code: "DEMOLER_ELEMENTOS_PELIGRO", label: "Demoler elementos en peligro de caer", group: "Medidas físicas" },
  { code: "RESTRINGIR_PASO_PEATONAL", label: "Restringir paso: Peatonal", group: "Restringir paso" },
  { code: "RESTRINGIR_PASO_VEHICULAR", label: "Restringir paso: Vehicular", group: "Restringir paso" },
  { code: "ESTABILIZAR_TALUDES", label: "Estabilizar taludes", group: "Medidas físicas" },
  { code: "DRENAR_AGUA", label: "Drenar agua", group: "Medidas físicas" },
  { code: "LIMPIAR_MATERIAL_CUBIERTA", label: "Limpiar material acumulado en cubierta", group: "Medidas físicas" },
  { code: "CAMBIAR_TEJA_CUBIERTA", label: "Cambiar teja/material de cubierta", group: "Medidas físicas" },
  { code: "OTRO", label: "Otro", group: "Otro", allowOther: true },
];

// --- Metadatos de presentación (semáforo) -----------------------------------
export const HABITABILITY_META: Record<string, { label: string; hex: string; textHex: string }> = {
  VERDE: { label: "Habitable", hex: "#22c55e", textHex: "#14532d" },
  AMARILLO: { label: "Uso restringido", hex: "#eab308", textHex: "#713f12" },
  ROJO: { label: "No habitable", hex: "#ef4444", textHex: "#7f1d1d" },
};

export const DAMAGE_LEVEL_META: Record<string, { label: string }> = {
  NINGUNO_MENOR: { label: "Ninguno/Menor" },
  MODERADO: { label: "Moderado" },
  SEVERO: { label: "Severo" },
};

/** Color de la casilla N/L·M·S según criticidad del elemento — idéntico al formulario impreso. */
export function severityBoxColor(tier: "CRITICO" | "SECUNDARIO", severity: "NL" | "M" | "S"): string {
  if (severity === "NL") return "#22c55e"; // verde siempre
  if (tier === "CRITICO") return "#ef4444"; // rojo en M y S
  return "#eab308"; // amarillo en M y S
}

/** Todos los catálogos cerrados en un solo objeto — servido por GET /api/catalog para que el frontend no duplique estas listas. */
export function getFullCatalog() {
  return {
    threatTypes: THREAT_TYPES,
    buildingUses: BUILDING_USES,
    structuralSystems: STRUCTURAL_SYSTEMS,
    floorSystems: FLOOR_SYSTEMS,
    roofSupportSystems: ROOF_SUPPORT_SYSTEMS,
    roofTypes: ROOF_TYPES,
    siteMorphology: SITE_MORPHOLOGY,
    structuralElements: STRUCTURAL_ELEMENTS,
    nonStructuralElements: NON_STRUCTURAL_ELEMENTS,
    safetyRecommendations: SAFETY_RECOMMENDATIONS,
    habitabilityMeta: HABITABILITY_META,
    damageLevelMeta: DAMAGE_LEVEL_META,
  };
}
