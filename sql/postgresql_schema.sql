-- =============================================================================
-- Formulario Regional para Evaluación Rápida de Daños en Edificaciones
-- DDL PostgreSQL — equivalente legible de prisma/schema.prisma, sin depender
-- de generar el cliente de Prisma para poder inspeccionar/ejecutar el esquema
-- directamente. Espejo funcional de src/db/schema.sql (SQLite, demo).
-- Ver docs/ANALISIS-Y-ARQUITECTURA.md §4-5 y docs/DESPLIEGUE.md.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

CREATE TYPE role AS ENUM ('INSPECTOR', 'ADMIN');
CREATE TYPE inspection_status AS ENUM ('BORRADOR', 'EN_PROCESO', 'FINALIZADA', 'INFORME_GENERADO');
CREATE TYPE yes_no AS ENUM ('SI', 'NO');
CREATE TYPE tri_state AS ENUM ('SI', 'NO', 'NO_ES_CLARO');
CREATE TYPE habitability_color AS ENUM ('VERDE', 'AMARILLO', 'ROJO');
CREATE TYPE damage_level AS ENUM ('NINGUNO_MENOR', 'MODERADO', 'SEVERO');
CREATE TYPE area_type AS ENUM ('URBANO', 'RURAL');
CREATE TYPE location_source AS ENUM ('GPS', 'MANUAL');
CREATE TYPE building_ownership AS ENUM ('PUBLICA', 'PRIVADA');
CREATE TYPE occupation_status AS ENUM ('OCUPADA', 'DESOCUPADA');
CREATE TYPE evaluator_doc_type AS ENUM ('CC', 'PASAPORTE');
CREATE TYPE element_category AS ENUM ('ESTRUCTURAL', 'NO_ESTRUCTURAL');
CREATE TYPE element_severity AS ENUM ('NL', 'M', 'S');
CREATE TYPE photo_kind AS ENUM ('PANORAMICA', 'DANIO', 'ESQUEMA_PLANTA', 'ESQUEMA_ELEVACION', 'FIRMA');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          role NOT NULL DEFAULT 'INSPECTOR',
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inspections (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  status                 inspection_status NOT NULL DEFAULT 'BORRADOR',
  inspector_user_id      UUID REFERENCES users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at           TIMESTAMPTZ,
  report_generated_at    TIMESTAMPTZ,

  form_number            TEXT,
  zone_id                TEXT,
  evaluator_name         TEXT,
  inspection_date        TEXT,
  inspection_time        TEXT,
  inspection_time_period TEXT,
  group_id               TEXT,
  entity                 TEXT,
  contact_person         TEXT,
  contact_phone          TEXT,

  -- Víctimas y afectación humana — extensión aditiva (ver ANALISIS-Y-ARQUITECTURA.md §3 A6)
  num_deaths    INTEGER,
  num_injured     INTEGER,
  num_missing       INTEGER,
  num_affected         INTEGER,
  victims_notes             TEXT,

  inspection_type            TEXT,
  habitability                habitability_color,
  damage_level                 damage_level,
  habitability_suggested        habitability_color,
  damage_level_suggested          damage_level,
  classification_overridden        BOOLEAN NOT NULL DEFAULT false,

  previous_evaluation_exists        BOOLEAN,
  previous_evaluation_type           TEXT,
  previous_evaluation_entity          TEXT,
  previous_evaluation_habitability     habitability_color,
  previous_evaluation_date               TEXT,

  department        TEXT,
  municipality        TEXT,
  neighborhood          TEXT,
  area_type               area_type,
  latitude                  DOUBLE PRECISION,
  longitude                   DOUBLE PRECISION,
  location_source               location_source,

  address               TEXT,
  building_name           TEXT,
  floors_above_ground        INTEGER,
  basements                     INTEGER,
  building_ownership              building_ownership,
  front_dimension                    DOUBLE PRECISION,
  depth_dimension                       DOUBLE PRECISION,

  site_morphology         TEXT,
  site_morphology_other      TEXT,
  water_body_threat             BOOLEAN,
  water_body_distance              DOUBLE PRECISION,
  water_body_notes                    TEXT,
  weak_story                             BOOLEAN,
  short_column                              BOOLEAN,
  stiffness_change                             BOOLEAN,

  total_collapse            yes_no,
  partial_collapse             tri_state,
  evident_tilt                    yes_no,
  adjacent_building_risk             tri_state,

  soil_liquefaction   yes_no,
  nearby_landslides      yes_no,

  occupation_status occupation_status,

  final_comments TEXT,

  evaluator_id_code               TEXT,
  evaluator_doc_type                 evaluator_doc_type,
  evaluator_doc_number                  TEXT,
  evaluator_entity                         TEXT,
  evaluator_dependencia                       TEXT,
  responsible_official_name                      TEXT,
  responsible_official_cc                           TEXT,
  responsible_official_entity                          TEXT
);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_created ON inspections(created_at);

CREATE TABLE inspection_threat_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  threat_code   TEXT NOT NULL,
  other_text    TEXT
);
CREATE TABLE inspection_building_uses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  use_code      TEXT NOT NULL,
  other_text    TEXT
);
CREATE TABLE inspection_structural_systems (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  system_code   TEXT NOT NULL,
  other_text    TEXT
);
CREATE TABLE inspection_floor_systems (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  system_code   TEXT NOT NULL,
  other_text    TEXT
);
CREATE TABLE inspection_roof_support_systems (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  system_code   TEXT NOT NULL,
  other_text    TEXT
);
CREATE TABLE inspection_roof_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  roof_type_code  TEXT NOT NULL,
  other_text      TEXT
);
CREATE TABLE inspection_safety_recommendations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id       UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  recommendation_code TEXT NOT NULL,
  other_text          TEXT
);

-- Secciones 9 y 10 — checklist oficial de severidad N/L·M·S por elemento.
CREATE TABLE inspection_element_damages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  category        element_category NOT NULL,
  element_code    TEXT NOT NULL,
  severity        element_severity NOT NULL,
  other_label     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(inspection_id, element_code)
);

-- Extensión aditiva (ver ANALISIS-Y-ARQUITECTURA.md §3 A4): daño individual
-- con foto/descripción, colgado de un elemento ya definido por el formulario.
CREATE TABLE damage_records (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id        UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  element_damage_id    UUID REFERENCES inspection_element_damages(id) ON DELETE SET NULL,
  element_label        TEXT NOT NULL,
  location             TEXT,
  damage_type          TEXT,
  description          TEXT,
  severity             element_severity,
  extent               TEXT,
  recommendation       TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE photos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id      UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  damage_record_id   UUID REFERENCES damage_records(id) ON DELETE CASCADE,
  kind               photo_kind NOT NULL DEFAULT 'PANORAMICA',
  url                TEXT NOT NULL,
  caption            TEXT,
  latitude           DOUBLE PRECISION,
  longitude          DOUBLE PRECISION,
  taken_at           TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_threat_types_insp ON inspection_threat_types(inspection_id);
CREATE INDEX idx_building_uses_insp ON inspection_building_uses(inspection_id);
CREATE INDEX idx_structural_systems_insp ON inspection_structural_systems(inspection_id);
CREATE INDEX idx_floor_systems_insp ON inspection_floor_systems(inspection_id);
CREATE INDEX idx_roof_support_insp ON inspection_roof_support_systems(inspection_id);
CREATE INDEX idx_roof_types_insp ON inspection_roof_types(inspection_id);
CREATE INDEX idx_safety_reco_insp ON inspection_safety_recommendations(inspection_id);
CREATE INDEX idx_element_damages_insp ON inspection_element_damages(inspection_id);
CREATE INDEX idx_damage_records_insp ON damage_records(inspection_id);
CREATE INDEX idx_photos_insp ON photos(inspection_id);
CREATE INDEX idx_photos_damage_record ON photos(damage_record_id);
