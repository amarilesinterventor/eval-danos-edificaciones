-- =============================================================================
-- Formulario Regional para Evaluación Rápida de Daños en Edificaciones
-- Esquema SQLite (servidor de demostración) — espejo funcional de
-- prisma/schema.prisma (PostgreSQL, modelo objetivo de producción).
-- Ver docs/ANALISIS-Y-ARQUITECTURA.md §5 para el resumen del modelo de datos
-- y §1 para la correspondencia de cada columna con la sección del formulario.
-- =============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'INSPECTOR', -- INSPECTOR | ADMIN
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------------------
-- Tabla ancha con los campos de valor único del formulario. Los grupos de
-- selección múltiple / repetibles viven en tablas hijas más abajo.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspections (
  id                     TEXT PRIMARY KEY,

  -- Estado / auditoría (no son campos impresos del formulario)
  status                 TEXT NOT NULL DEFAULT 'BORRADOR', -- BORRADOR | EN_PROCESO | FINALIZADA | INFORME_GENERADO
  inspector_user_id      TEXT REFERENCES users(id),
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  finalized_at           TEXT,
  report_generated_at    TEXT,

  -- Sección 1 — Identificación de la evaluación
  form_number            TEXT,
  zone_id                TEXT,
  evaluator_name         TEXT,
  inspection_date        TEXT,
  inspection_time        TEXT,
  inspection_time_period TEXT, -- am | pm
  group_id               TEXT,
  entity                 TEXT,
  contact_person         TEXT,
  contact_phone          TEXT,

  -- Víctimas y afectación humana — EXTENSIÓN aditiva, no está en el formulario
  -- impreso original; agregada a solicitud explícita del usuario (ver
  -- docs/ANALISIS-Y-ARQUITECTURA.md §3, A6). Se registra junto a la
  -- identificación de la evaluación (sección 1) porque es información que se
  -- recopila en el mismo momento inicial de la inspección.
  num_deaths      INTEGER,
  num_injured      INTEGER,
  num_missing       INTEGER,
  num_affected        INTEGER, -- damnificados
  victims_notes          TEXT,

  -- Sección 2 / 12 — Clasificación de habitabilidad y nivel de daño (campo único, ver A3)
  inspection_type            TEXT, -- EXTERIOR | COMPLETA
  habitability                TEXT, -- VERDE | AMARILLO | ROJO
  damage_level                 TEXT, -- NINGUNO_MENOR | MODERADO | SEVERO
  habitability_suggested       TEXT, -- última sugerencia calculada (auditoría/transparencia, no vinculante)
  damage_level_suggested       TEXT,
  classification_overridden    INTEGER NOT NULL DEFAULT 0, -- 1 si el inspector se apartó de la sugerencia

  -- Sección 12 — Evaluación previa
  previous_evaluation_exists        INTEGER, -- 0/1, NULL = no diligenciado
  previous_evaluation_type          TEXT,
  previous_evaluation_entity        TEXT,
  previous_evaluation_habitability  TEXT,
  previous_evaluation_date          TEXT,

  -- Sección 3 — Información general (ubicación)
  department        TEXT,
  municipality       TEXT,
  neighborhood        TEXT,
  area_type            TEXT, -- URBANO | RURAL
  latitude             REAL,
  longitude            REAL,
  location_source      TEXT, -- GPS | MANUAL

  -- Sección 4 — Identificación de la edificación
  address               TEXT,
  building_name          TEXT,
  floors_above_ground     INTEGER,
  basements                INTEGER,
  building_ownership        TEXT, -- PUBLICA | PRIVADA
  front_dimension             REAL,
  depth_dimension              REAL,

  -- Sección 6 — Condiciones preexistentes y de entorno
  site_morphology         TEXT,
  site_morphology_other    TEXT,
  water_body_threat         INTEGER, -- 0/1, NULL = no diligenciado
  water_body_distance         REAL,
  water_body_notes             TEXT,
  weak_story                     INTEGER, -- solo si evaluación por sismo
  short_column                     INTEGER,
  stiffness_change                   INTEGER,

  -- Sección 7 — Peligro global
  total_collapse            TEXT, -- SI | NO
  partial_collapse            TEXT, -- SI | NO | NO_ES_CLARO
  evident_tilt                  TEXT, -- SI | NO
  adjacent_building_risk          TEXT, -- SI | NO | NO_ES_CLARO

  -- Sección 8 — Peligro por condiciones geotécnicas
  soil_liquefaction        TEXT, -- SI | NO
  nearby_landslides          TEXT, -- SI | NO

  -- Sección 13 — Ocupación
  occupation_status   TEXT, -- OCUPADA | DESOCUPADA

  -- Sección 15 — Comentarios finales
  final_comments TEXT,

  -- Sección 16 — Información del evaluador
  evaluator_id_code               TEXT,
  evaluator_doc_type                TEXT, -- CC | PASAPORTE
  evaluator_doc_number                TEXT,
  evaluator_entity                      TEXT,
  evaluator_dependencia                   TEXT,
  responsible_official_name                 TEXT,
  responsible_official_cc                     TEXT,
  responsible_official_entity                   TEXT
);

CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_created ON inspections(created_at);

-- -----------------------------------------------------------------------------
-- Grupos de selección múltiple (checkboxes) — "replace all" en cada guardado
-- de paso del wizard, por eso no necesitan más columnas que el código elegido.
-- -----------------------------------------------------------------------------

-- Sección 1 — Tipo de amenaza (multi-selección)
CREATE TABLE IF NOT EXISTS inspection_threat_types (
  id             TEXT PRIMARY KEY,
  inspection_id  TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  threat_code    TEXT NOT NULL,
  other_text     TEXT
);

-- Sección 4 — Uso de la edificación (multi-selección: puede ser mixto)
CREATE TABLE IF NOT EXISTS inspection_building_uses (
  id             TEXT PRIMARY KEY,
  inspection_id  TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  use_code       TEXT NOT NULL,
  other_text     TEXT
);

-- Sección 5.1 — Sistema estructural (multi-selección)
CREATE TABLE IF NOT EXISTS inspection_structural_systems (
  id             TEXT PRIMARY KEY,
  inspection_id  TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  system_code    TEXT NOT NULL,
  other_text     TEXT
);

-- Sección 5.2 — Sistema de entrepiso (multi-selección)
CREATE TABLE IF NOT EXISTS inspection_floor_systems (
  id             TEXT PRIMARY KEY,
  inspection_id  TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  system_code    TEXT NOT NULL,
  other_text     TEXT
);

-- Sección 5.3 — Sistema de soporte de cubierta (multi-selección)
CREATE TABLE IF NOT EXISTS inspection_roof_support_systems (
  id             TEXT PRIMARY KEY,
  inspection_id  TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  system_code    TEXT NOT NULL,
  other_text     TEXT
);

-- Sección 5.4 — Tipo de cubierta (multi-selección)
CREATE TABLE IF NOT EXISTS inspection_roof_types (
  id                TEXT PRIMARY KEY,
  inspection_id     TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  roof_type_code    TEXT NOT NULL,
  other_text        TEXT
);

-- Sección 14 — Recomendaciones y medidas de seguridad (multi-selección)
CREATE TABLE IF NOT EXISTS inspection_safety_recommendations (
  id                    TEXT PRIMARY KEY,
  inspection_id         TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  recommendation_code   TEXT NOT NULL,
  other_text            TEXT
);

-- -----------------------------------------------------------------------------
-- Secciones 9 y 10 — Peligro por daño en elementos estructurales / no
-- estructurales (checklist oficial de severidad N/L · M · S).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspection_element_damages (
  id              TEXT PRIMARY KEY,
  inspection_id   TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  category        TEXT NOT NULL, -- ESTRUCTURAL | NO_ESTRUCTURAL
  element_code    TEXT NOT NULL,
  severity        TEXT NOT NULL, -- NL | M | S
  other_label     TEXT, -- solo aplica al elemento OTROS de la sección 10
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(inspection_id, element_code)
);

-- -----------------------------------------------------------------------------
-- Extensión aditiva (ver docs/ANALISIS-Y-ARQUITECTURA.md §3, A4): registro de
-- daño individual con foto/descripción, colgado de un elemento ya definido por
-- el formulario. No reemplaza ni contradice el checklist oficial de arriba.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS damage_records (
  id                   TEXT PRIMARY KEY,
  inspection_id        TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  element_damage_id    TEXT REFERENCES inspection_element_damages(id) ON DELETE SET NULL,
  element_label        TEXT NOT NULL,
  location             TEXT,
  damage_type          TEXT,
  description           TEXT,
  severity               TEXT, -- NL | M | S
  extent                    TEXT,
  recommendation              TEXT,
  notes                         TEXT,
  created_at                      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------------------
-- Fotografías — ligadas a la inspección (panorámica, esquema planta/elevación,
-- firma) o a un daño individual (`damage_records`). `kind` distingue el uso.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS photos (
  id                 TEXT PRIMARY KEY,
  inspection_id      TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  damage_record_id   TEXT REFERENCES damage_records(id) ON DELETE CASCADE,
  kind               TEXT NOT NULL DEFAULT 'PANORAMICA', -- PANORAMICA | DANIO | ESQUEMA_PLANTA | ESQUEMA_ELEVACION | FIRMA
  url                TEXT NOT NULL,
  caption            TEXT,
  latitude           REAL,
  longitude          REAL,
  taken_at           TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_threat_types_insp ON inspection_threat_types(inspection_id);
CREATE INDEX IF NOT EXISTS idx_building_uses_insp ON inspection_building_uses(inspection_id);
CREATE INDEX IF NOT EXISTS idx_structural_systems_insp ON inspection_structural_systems(inspection_id);
CREATE INDEX IF NOT EXISTS idx_floor_systems_insp ON inspection_floor_systems(inspection_id);
CREATE INDEX IF NOT EXISTS idx_roof_support_insp ON inspection_roof_support_systems(inspection_id);
CREATE INDEX IF NOT EXISTS idx_roof_types_insp ON inspection_roof_types(inspection_id);
CREATE INDEX IF NOT EXISTS idx_safety_reco_insp ON inspection_safety_recommendations(inspection_id);
CREATE INDEX IF NOT EXISTS idx_element_damages_insp ON inspection_element_damages(inspection_id);
CREATE INDEX IF NOT EXISTS idx_damage_records_insp ON damage_records(inspection_id);
CREATE INDEX IF NOT EXISTS idx_photos_insp ON photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_photos_damage_record ON photos(damage_record_id);
