/**
 * Funciones de acceso a datos (SQLite) del servidor de demostración. En
 * producción este archivo se reemplaza por `PrismaClient` sobre
 * prisma/schema.prisma; el resto de la aplicación (src/domain, rutas HTTP,
 * frontend) no necesita cambios — ver docs/ANALISIS-Y-ARQUITECTURA.md §4.
 */
import { db, newId, transaction, nowIso } from "./db.js";

// ---------------------------------------------------------------------------
// Inspecciones — tabla ancha (ver src/db/schema.sql)
// ---------------------------------------------------------------------------

/** camelCase (payload del frontend) -> snake_case (columna SQL), campos de valor único editables por PATCH. */
const INSPECTION_COLUMN_MAP: Record<string, string> = {
  formNumber: "form_number",
  zoneId: "zone_id",
  evaluatorName: "evaluator_name",
  inspectionDate: "inspection_date",
  inspectionTime: "inspection_time",
  inspectionTimePeriod: "inspection_time_period",
  groupId: "group_id",
  entity: "entity",
  contactPerson: "contact_person",
  contactPhone: "contact_phone",

  numDeaths: "num_deaths",
  numInjured: "num_injured",
  numMissing: "num_missing",
  numAffected: "num_affected",
  victimsNotes: "victims_notes",

  inspectionType: "inspection_type",
  habitability: "habitability",
  damageLevel: "damage_level",
  habitabilitySuggested: "habitability_suggested",
  damageLevelSuggested: "damage_level_suggested",
  classificationOverridden: "classification_overridden",

  previousEvaluationExists: "previous_evaluation_exists",
  previousEvaluationType: "previous_evaluation_type",
  previousEvaluationEntity: "previous_evaluation_entity",
  previousEvaluationHabitability: "previous_evaluation_habitability",
  previousEvaluationDate: "previous_evaluation_date",

  department: "department",
  municipality: "municipality",
  neighborhood: "neighborhood",
  areaType: "area_type",
  latitude: "latitude",
  longitude: "longitude",
  locationSource: "location_source",

  address: "address",
  buildingName: "building_name",
  floorsAboveGround: "floors_above_ground",
  basements: "basements",
  buildingOwnership: "building_ownership",
  frontDimension: "front_dimension",
  depthDimension: "depth_dimension",

  siteMorphology: "site_morphology",
  siteMorphologyOther: "site_morphology_other",
  waterBodyThreat: "water_body_threat",
  waterBodyDistance: "water_body_distance",
  waterBodyNotes: "water_body_notes",
  weakStory: "weak_story",
  shortColumn: "short_column",
  stiffnessChange: "stiffness_change",

  totalCollapse: "total_collapse",
  partialCollapse: "partial_collapse",
  evidentTilt: "evident_tilt",
  adjacentBuildingRisk: "adjacent_building_risk",

  soilLiquefaction: "soil_liquefaction",
  nearbyLandslides: "nearby_landslides",

  occupationStatus: "occupation_status",
  finalComments: "final_comments",

  evaluatorIdCode: "evaluator_id_code",
  evaluatorDocType: "evaluator_doc_type",
  evaluatorDocNumber: "evaluator_doc_number",
  evaluatorEntity: "evaluator_entity",
  evaluatorDependencia: "evaluator_dependencia",
  responsibleOfficialName: "responsible_official_name",
  responsibleOfficialCc: "responsible_official_cc",
  responsibleOfficialEntity: "responsible_official_entity",
};

/** Campos que se guardan como INTEGER 0/1 nullable (tri-estado NULL = no diligenciado). */
const BOOL_INT_FIELDS = new Set(["waterBodyThreat", "weakStory", "shortColumn", "stiffnessChange", "previousEvaluationExists", "classificationOverridden"]);

function normalizeValue(key: string, value: any): any {
  if (value === undefined) return undefined;
  if (value === "" ) return null;
  if (BOOL_INT_FIELDS.has(key)) {
    if (value === null) return null;
    return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
  }
  return value;
}

/**
 * `payload.id`, si viene informado, se usa como id del registro en vez de
 * generar uno nuevo — permite que el frontend genere el UUID en el cliente
 * (crypto.randomUUID()) y lo use de inmediato para navegar al wizard y
 * encolar operaciones dependientes (fotos, daños) mientras está sin conexión,
 * sin esperar una respuesta del servidor para conocer el id real. Ver
 * public/offline.js.
 */
export function createInspection(inspectorUserId: string | null, payload: Record<string, any> = {}) {
  const id = payload.id ?? newId();
  // Idempotente: si el id ya existe (p.ej. la creación se encoló offline y el
  // cliente reintentó el envío tras reconectar antes de recibir la respuesta
  // anterior), se trata como ya sincronizada en vez de fallar por PK duplicada.
  const existing = db.prepare(`SELECT id FROM inspections WHERE id = ?`).get(id);
  if (!existing) {
    db.prepare(
      `INSERT INTO inspections (id, status, inspector_user_id, evaluator_name, inspection_date, inspection_time, inspection_time_period)
       VALUES (?, 'BORRADOR', ?, ?, ?, ?, ?)`,
    ).run(
      id,
      inspectorUserId,
      payload.evaluatorName ?? null,
      payload.inspectionDate ?? new Date().toISOString().slice(0, 10),
      payload.inspectionTime ?? null,
      payload.inspectionTimePeriod ?? null,
    );
  }
  return getInspection(id);
}

/** Actualización parcial de los campos de valor único (cualquier paso del wizard). Solo toca columnas presentes en `payload` y en el whitelist. */
export function updateInspectionFields(id: string, payload: Record<string, any>) {
  const sets: string[] = [];
  const values: any[] = [];
  for (const [key, column] of Object.entries(INSPECTION_COLUMN_MAP)) {
    if (!(key in payload)) continue;
    sets.push(`${column} = ?`);
    values.push(normalizeValue(key, payload[key]));
  }
  if (sets.length === 0) return getInspection(id);
  sets.push(`updated_at = ?`);
  values.push(nowIso());
  values.push(id);
  db.prepare(`UPDATE inspections SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getInspection(id);
}

export function updateInspectionStatus(id: string, status: string) {
  const extra: string[] = [];
  const values: any[] = [status, nowIso()];
  if (status === "FINALIZADA") extra.push(`finalized_at = ?`), values.push(nowIso());
  if (status === "INFORME_GENERADO") extra.push(`report_generated_at = ?`), values.push(nowIso());
  values.push(id);
  db.prepare(`UPDATE inspections SET status = ?, updated_at = ? ${extra.length ? "," + extra.join(",") : ""} WHERE id = ?`).run(...values);
  return getInspection(id);
}

export function deleteInspection(id: string) {
  db.prepare(`DELETE FROM inspections WHERE id = ?`).run(id);
}

export function listInspections(filters: { status?: string } = {}) {
  let sql = `SELECT id, status, form_number, evaluator_name, inspection_date, address, building_name,
                    municipality, department, habitability, damage_level, created_at, updated_at,
                    finalized_at, report_generated_at
             FROM inspections`;
  const values: any[] = [];
  if (filters.status) {
    sql += ` WHERE status = ?`;
    values.push(filters.status);
  }
  sql += ` ORDER BY updated_at DESC`;
  return db.prepare(sql).all(...values) as any[];
}

export function getInspection(id: string) {
  const inspection = db.prepare(`SELECT * FROM inspections WHERE id = ?`).get(id) as any;
  if (!inspection) return null;

  inspection.threatTypes = db.prepare(`SELECT threat_code AS code, other_text AS otherText FROM inspection_threat_types WHERE inspection_id = ?`).all(id);
  inspection.buildingUses = db.prepare(`SELECT use_code AS code, other_text AS otherText FROM inspection_building_uses WHERE inspection_id = ?`).all(id);
  inspection.structuralSystems = db.prepare(`SELECT system_code AS code, other_text AS otherText FROM inspection_structural_systems WHERE inspection_id = ?`).all(id);
  inspection.floorSystems = db.prepare(`SELECT system_code AS code, other_text AS otherText FROM inspection_floor_systems WHERE inspection_id = ?`).all(id);
  inspection.roofSupportSystems = db.prepare(`SELECT system_code AS code, other_text AS otherText FROM inspection_roof_support_systems WHERE inspection_id = ?`).all(id);
  inspection.roofTypes = db.prepare(`SELECT roof_type_code AS code, other_text AS otherText FROM inspection_roof_types WHERE inspection_id = ?`).all(id);
  inspection.safetyRecommendations = db.prepare(`SELECT recommendation_code AS code, other_text AS otherText FROM inspection_safety_recommendations WHERE inspection_id = ?`).all(id);
  inspection.elementDamages = db.prepare(`SELECT * FROM inspection_element_damages WHERE inspection_id = ? ORDER BY category, element_code`).all(id);

  const damageRecords = db.prepare(`SELECT * FROM damage_records WHERE inspection_id = ? ORDER BY created_at`).all(id) as any[];
  for (const dr of damageRecords) {
    dr.photos = db.prepare(`SELECT * FROM photos WHERE damage_record_id = ? ORDER BY created_at`).all(dr.id);
  }
  inspection.damageRecords = damageRecords;

  inspection.photos = db.prepare(`SELECT * FROM photos WHERE inspection_id = ? AND damage_record_id IS NULL ORDER BY created_at`).all(id);

  return inspection;
}

// --- Grupos de selección múltiple: "replace all" dentro de una transacción ---

function replaceGroup(table: string, column: string, inspectionId: string, items: Array<{ code: string; otherText?: string }>) {
  transaction(() => {
    db.prepare(`DELETE FROM ${table} WHERE inspection_id = ?`).run(inspectionId);
    for (const item of items) {
      db.prepare(`INSERT INTO ${table} (id, inspection_id, ${column}, other_text) VALUES (?, ?, ?, ?)`).run(
        newId(),
        inspectionId,
        item.code,
        item.otherText ?? null,
      );
    }
    db.prepare(`UPDATE inspections SET updated_at = ? WHERE id = ?`).run(nowIso(), inspectionId);
  });
}

export const replaceThreatTypes = (id: string, items: Array<{ code: string; otherText?: string }>) => replaceGroup("inspection_threat_types", "threat_code", id, items);
export const replaceBuildingUses = (id: string, items: Array<{ code: string; otherText?: string }>) => replaceGroup("inspection_building_uses", "use_code", id, items);
export const replaceStructuralSystems = (id: string, items: Array<{ code: string; otherText?: string }>) => replaceGroup("inspection_structural_systems", "system_code", id, items);
export const replaceFloorSystems = (id: string, items: Array<{ code: string; otherText?: string }>) => replaceGroup("inspection_floor_systems", "system_code", id, items);
export const replaceRoofSupportSystems = (id: string, items: Array<{ code: string; otherText?: string }>) => replaceGroup("inspection_roof_support_systems", "system_code", id, items);
export const replaceSafetyRecommendations = (id: string, items: Array<{ code: string; otherText?: string }>) => replaceGroup("inspection_safety_recommendations", "recommendation_code", id, items);

export const replaceRoofTypes = (id: string, items: Array<{ code: string; otherText?: string }>) => replaceGroup("inspection_roof_types", "roof_type_code", id, items);

// --- Secciones 9-10: daño por elemento (upsert por elemento, no "replace all", ---
// --- porque cada checkbox se marca/desmarca independientemente en la UI) ------

export function upsertElementDamage(
  inspectionId: string,
  payload: { elementCode: string; category: string; severity: string; otherLabel?: string },
) {
  const existing = db
    .prepare(`SELECT id FROM inspection_element_damages WHERE inspection_id = ? AND element_code = ?`)
    .get(inspectionId, payload.elementCode) as any;
  if (existing) {
    db.prepare(`UPDATE inspection_element_damages SET severity = ?, other_label = ?, updated_at = ? WHERE id = ?`).run(
      payload.severity,
      payload.otherLabel ?? null,
      nowIso(),
      existing.id,
    );
  } else {
    db.prepare(
      `INSERT INTO inspection_element_damages (id, inspection_id, category, element_code, severity, other_label) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(newId(), inspectionId, payload.category, payload.elementCode, payload.severity, payload.otherLabel ?? null);
  }
  db.prepare(`UPDATE inspections SET updated_at = ? WHERE id = ?`).run(nowIso(), inspectionId);
  return db.prepare(`SELECT * FROM inspection_element_damages WHERE inspection_id = ? AND element_code = ?`).get(inspectionId, payload.elementCode);
}

export function deleteElementDamage(inspectionId: string, elementCode: string) {
  db.prepare(`DELETE FROM inspection_element_damages WHERE inspection_id = ? AND element_code = ?`).run(inspectionId, elementCode);
}

export function listElementDamages(inspectionId: string) {
  return db.prepare(`SELECT * FROM inspection_element_damages WHERE inspection_id = ?`).all(inspectionId) as any[];
}

// --- Registro de daño individual (extensión aditiva — ver A4) ---------------

/** `payload.id` opcional — mismo propósito que en createInspection (ver ese comentario). */
export function addDamageRecord(inspectionId: string, payload: Record<string, any>) {
  const id = payload.id ?? newId();
  const existing = db.prepare(`SELECT id FROM damage_records WHERE id = ?`).get(id);
  if (!existing) {
    db.prepare(
      `INSERT INTO damage_records (id, inspection_id, element_damage_id, element_label, location, damage_type, description, severity, extent, recommendation, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      inspectionId,
      payload.elementDamageId ?? null,
      payload.elementLabel,
      payload.location ?? null,
      payload.damageType ?? null,
      payload.description ?? null,
      payload.severity ?? null,
      payload.extent ?? null,
      payload.recommendation ?? null,
      payload.notes ?? null,
    );
    db.prepare(`UPDATE inspections SET updated_at = ? WHERE id = ?`).run(nowIso(), inspectionId);
  }
  return db.prepare(`SELECT * FROM damage_records WHERE id = ?`).get(id);
}

export function updateDamageRecord(id: string, payload: Record<string, any>) {
  const fields = ["elementLabel", "location", "damageType", "description", "severity", "extent", "recommendation", "notes"];
  const colMap: Record<string, string> = {
    elementLabel: "element_label",
    location: "location",
    damageType: "damage_type",
    description: "description",
    severity: "severity",
    extent: "extent",
    recommendation: "recommendation",
    notes: "notes",
  };
  const sets: string[] = [];
  const values: any[] = [];
  for (const f of fields) {
    if (!(f in payload)) continue;
    sets.push(`${colMap[f]} = ?`);
    values.push(payload[f] === "" ? null : payload[f]);
  }
  if (sets.length) {
    sets.push(`updated_at = ?`);
    values.push(nowIso());
    values.push(id);
    db.prepare(`UPDATE damage_records SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  }
  return db.prepare(`SELECT * FROM damage_records WHERE id = ?`).get(id);
}

export function deleteDamageRecord(id: string) {
  db.prepare(`DELETE FROM damage_records WHERE id = ?`).run(id);
}

/** URLs de las fotos ligadas a un daño individual — para borrar los archivos de disco antes de eliminar el registro (el cascade de SQLite solo alcanza a las filas, no al sistema de archivos). */
export function listPhotoUrlsForDamageRecord(damageRecordId: string): string[] {
  const rows = db.prepare(`SELECT url FROM photos WHERE damage_record_id = ?`).all(damageRecordId) as any[];
  return rows.map((r) => r.url);
}

// --- Fotos --------------------------------------------------------------------

export function addPhoto(payload: {
  id?: string;
  inspectionId: string;
  damageRecordId?: string | null;
  kind: string;
  url: string;
  caption?: string;
  latitude?: number | null;
  longitude?: number | null;
  takenAt?: string | null;
}) {
  const id = payload.id ?? newId();
  const existing = db.prepare(`SELECT id FROM photos WHERE id = ?`).get(id);
  if (!existing) {
    db.prepare(
      `INSERT INTO photos (id, inspection_id, damage_record_id, kind, url, caption, latitude, longitude, taken_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      payload.inspectionId,
      payload.damageRecordId ?? null,
      payload.kind,
      payload.url,
      payload.caption ?? null,
      payload.latitude ?? null,
      payload.longitude ?? null,
      payload.takenAt ?? null,
    );
    db.prepare(`UPDATE inspections SET updated_at = ? WHERE id = ?`).run(nowIso(), payload.inspectionId);
  }
  return db.prepare(`SELECT * FROM photos WHERE id = ?`).get(id);
}

export function getPhoto(id: string) {
  return db.prepare(`SELECT * FROM photos WHERE id = ?`).get(id) as any;
}

export function deletePhoto(id: string) {
  db.prepare(`DELETE FROM photos WHERE id = ?`).run(id);
}

// --- Usuarios -------------------------------------------------------------------

export function findUserByEmail(email: string) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;
}

export function findUserById(id: string) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as any;
}

export function listUsers() {
  return db.prepare(`SELECT id, name, email, role, active FROM users ORDER BY name`).all();
}

export function createUser(payload: { name: string; email: string; passwordHash: string; role?: string }) {
  const id = newId();
  db.prepare(`INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(
    id,
    payload.name,
    payload.email,
    payload.passwordHash,
    payload.role ?? "INSPECTOR",
  );
  return id;
}

// --- Dashboard --------------------------------------------------------------------

export function getDashboardStats() {
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM inspections`).get() as any).n as number;
  const byStatus = db.prepare(`SELECT status, COUNT(*) AS n FROM inspections GROUP BY status`).all() as any[];
  const byHabitability = db
    .prepare(`SELECT habitability, COUNT(*) AS n FROM inspections WHERE habitability IS NOT NULL GROUP BY habitability`)
    .all() as any[];
  const recent = db
    .prepare(
      `SELECT id, status, form_number, building_name, address, municipality, department, habitability, damage_level, updated_at
       FROM inspections ORDER BY updated_at DESC LIMIT 8`,
    )
    .all() as any[];
  const totalPhotos = (db.prepare(`SELECT COUNT(*) AS n FROM photos`).get() as any).n as number;
  const totalDamages = (db.prepare(`SELECT COUNT(*) AS n FROM inspection_element_damages WHERE severity != 'NL'`).get() as any).n as number;
  return { total, byStatus, byHabitability, recent, totalPhotos, totalDamages };
}
