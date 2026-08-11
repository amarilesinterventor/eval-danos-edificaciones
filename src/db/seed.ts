/**
 * Siembra de datos de ejemplo: un par de inspecciones de muestra para que el
 * dashboard y el listado no arranquen vacíos. Se ejecuta con `npm run seed`,
 * y automáticamente en el arranque del servidor si la base de datos está
 * vacía (ver `autoSeedIfEmpty` en src/server/server.ts — mismo patrón que
 * wabim-bridges, necesario para hosting sin disco persistente como el nivel
 * gratis de Render).
 *
 * No siembra cuentas de usuario: la herramienta no tiene login (decisión
 * explícita del usuario) — el inspector solo escribe su nombre en el paso 1.
 */
import { pathToFileURL } from "node:url";
import { db } from "./db.js";
import {
  createInspection,
  updateInspectionFields,
  replaceThreatTypes,
  replaceBuildingUses,
  replaceStructuralSystems,
  replaceFloorSystems,
  replaceRoofSupportSystems,
  replaceRoofTypes,
  replaceSafetyRecommendations,
  upsertElementDamage,
  addDamageRecord,
  updateInspectionStatus,
} from "./queries.js";

export function main() {
  const already = (db.prepare(`SELECT COUNT(*) AS n FROM inspections`).get() as any).n as number;
  if (already > 0) {
    console.log("Ya existen inspecciones — se omite la siembra de datos de ejemplo.");
    return;
  }

  console.log("Sembrando inspecciones de ejemplo...");

  // --- Ejemplo 1: edificación habitable, informe ya generado -----------------
  const insp1 = createInspection(null, { evaluatorName: "Inspector de Campo", inspectionDate: "2026-06-12", inspectionTime: "09:15", inspectionTimePeriod: "am" });
  updateInspectionFields(insp1.id, {
    formNumber: "FR-0001",
    zoneId: "Z-01",
    groupId: "G-1",
    entity: "Alcaldía Municipal",
    contactPerson: "María Gómez",
    contactPhone: "3001234567",
    inspectionType: "COMPLETA",
    department: "Risaralda",
    municipality: "Pereira",
    neighborhood: "Centro",
    areaType: "URBANO",
    latitude: 4.8133,
    longitude: -75.6961,
    locationSource: "GPS",
    address: "Calle 15 # 8-30",
    buildingName: "Edificio Los Álamos",
    floorsAboveGround: 4,
    basements: 0,
    buildingOwnership: "PRIVADA",
    frontDimension: 12,
    depthDimension: 18,
    siteMorphology: "DIVISORIA",
    waterBodyThreat: 0,
    totalCollapse: "NO",
    partialCollapse: "NO",
    evidentTilt: "NO",
    adjacentBuildingRisk: "NO",
    soilLiquefaction: "NO",
    nearbyLandslides: "NO",
    occupationStatus: "OCUPADA",
    habitability: "VERDE",
    damageLevel: "NINGUNO_MENOR",
    finalComments: "Edificación sin daños visibles. Se recomienda mantenimiento preventivo de rutina.",
    evaluatorIdCode: "EV-102",
    evaluatorDocType: "CC",
    evaluatorDocNumber: "1094123456",
    evaluatorEntity: "Cuerpo de Bomberos",
  });
  replaceThreatTypes(insp1.id, [{ code: "SISMO" }]);
  replaceBuildingUses(insp1.id, [{ code: "RESIDENCIAL" }]);
  replaceStructuralSystems(insp1.id, [{ code: "PORTICOS" }, { code: "MUROS_ESTRUCTURALES" }]);
  replaceFloorSystems(insp1.id, [{ code: "ENTREPISO_PLACA_MACIZA" }]);
  replaceRoofSupportSystems(insp1.id, [{ code: "CUBIERTA_VIGAS_CONCRETO" }]);
  replaceRoofTypes(insp1.id, [{ code: "TEJA_FIBROCEMENTO" }]);
  for (const code of ["COLUMNAS", "MUROS_PORTANTES", "VIGAS", "NODOS_CONEXION", "RIOSTRAS", "ENTREPISO"]) {
    upsertElementDamage(insp1.id, { elementCode: code, category: "ESTRUCTURAL", severity: "NL" });
  }
  updateInspectionStatus(insp1.id, "FINALIZADA");
  updateInspectionStatus(insp1.id, "INFORME_GENERADO");

  // --- Ejemplo 2: uso restringido, en proceso ---------------------------------
  const insp2 = createInspection(null, { evaluatorName: "Inspector de Campo", inspectionDate: "2026-07-02", inspectionTime: "14:40", inspectionTimePeriod: "pm" });
  updateInspectionFields(insp2.id, {
    formNumber: "FR-0002",
    zoneId: "Z-03",
    groupId: "G-2",
    entity: "Cuerpo de Bomberos",
    department: "Risaralda",
    municipality: "Dosquebradas",
    neighborhood: "La Badea",
    areaType: "URBANO",
    latitude: 4.8375,
    longitude: -75.6725,
    locationSource: "GPS",
    address: "Carrera 20 # 12-45",
    buildingName: "Conjunto Villa Verde — Torre 2",
    floorsAboveGround: 6,
    basements: 1,
    buildingOwnership: "PRIVADA",
    siteMorphology: "LADERA",
    totalCollapse: "NO",
    partialCollapse: "NO",
    evidentTilt: "NO",
    adjacentBuildingRisk: "SI",
    soilLiquefaction: "NO",
    nearbyLandslides: "NO",
    occupationStatus: "OCUPADA",
    habitability: "AMARILLO",
    damageLevel: "MODERADO",
    habitabilitySuggested: "AMARILLO",
    damageLevelSuggested: "MODERADO",
    evaluatorIdCode: "EV-102",
    evaluatorDocType: "CC",
    evaluatorDocNumber: "1094123456",
    evaluatorEntity: "Cuerpo de Bomberos",
  });
  replaceThreatTypes(insp2.id, [{ code: "SISMO" }]);
  replaceBuildingUses(insp2.id, [{ code: "RESIDENCIAL" }]);
  replaceStructuralSystems(insp2.id, [{ code: "MAMPOSTERIA_CONFINADA" }]);
  upsertElementDamage(insp2.id, { elementCode: "MUROS_PORTANTES", category: "ESTRUCTURAL", severity: "M" });
  upsertElementDamage(insp2.id, { elementCode: "MUROS_FACHADA_ANTEPECHOS", category: "NO_ESTRUCTURAL", severity: "S" });
  const dmg = upsertElementDamage(insp2.id, { elementCode: "COLUMNAS", category: "ESTRUCTURAL", severity: "NL" }) as any;
  addDamageRecord(insp2.id, {
    elementDamageId: dmg.id,
    elementLabel: "Muro de fachada, fachada norte, piso 3",
    location: "Fachada norte, piso 3",
    damageType: "Fisuras diagonales",
    description: "Fisuras diagonales de ancho variable cerca de una ventana.",
    severity: "S",
    extent: "Aprox. 2 m de longitud",
    recommendation: "Evaluación estructural detallada antes de reocupar esa zona.",
  });
  updateInspectionStatus(insp2.id, "EN_PROCESO");

  // --- Ejemplo 3: borrador recién creado --------------------------------------
  const insp3 = createInspection(null, { inspectionDate: "2026-08-09" });
  updateInspectionFields(insp3.id, { formNumber: "FR-0003", department: "Risaralda", municipality: "Pereira" });

  console.log("Siembra completa.");
}

// Solo se auto-ejecuta cuando el archivo se corre directamente (`npm run seed`),
// no cuando server.ts lo importa para la auto-siembra en hosting sin disco
// persistente (ver autoSeedIfEmpty en src/server/server.ts). `pathToFileURL`
// evita comparar rutas con barras invertidas de Windows contra un `file://` armado a mano.
const isRunDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isRunDirectly) {
  main();
}
