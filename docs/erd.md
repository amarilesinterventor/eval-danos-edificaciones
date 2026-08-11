# Modelo Entidad-Relación (ERD)

Corresponde al esquema PostgreSQL objetivo (`prisma/schema.prisma` / `sql/postgresql_schema.sql`). La
demostración usa un espejo funcional en SQLite (`src/db/schema.sql`).

```mermaid
erDiagram
    USER ||--o{ INSPECTION : "inspecciona"

    INSPECTION ||--o{ INSPECTION_THREAT_TYPE : "sección 1"
    INSPECTION ||--o{ INSPECTION_BUILDING_USE : "sección 4"
    INSPECTION ||--o{ INSPECTION_STRUCTURAL_SYSTEM : "sección 5.1"
    INSPECTION ||--o{ INSPECTION_FLOOR_SYSTEM : "sección 5.2"
    INSPECTION ||--o{ INSPECTION_ROOF_SUPPORT_SYSTEM : "sección 5.3"
    INSPECTION ||--o{ INSPECTION_ROOF_TYPE : "sección 5.4"
    INSPECTION ||--o{ INSPECTION_SAFETY_RECOMMENDATION : "sección 14"
    INSPECTION ||--o{ INSPECTION_ELEMENT_DAMAGE : "secciones 9-10"
    INSPECTION ||--o{ DAMAGE_RECORD : "extensión: daño individual"
    INSPECTION ||--o{ PHOTO : "panorámicas / esquema"

    INSPECTION_ELEMENT_DAMAGE ||--o{ DAMAGE_RECORD : "detalle con foto"
    DAMAGE_RECORD ||--o{ PHOTO : "tiene"

    USER {
        string id PK
        string name
        string email UK
        string password_hash
        enum role
        bool active
    }
    INSPECTION {
        string id PK
        enum status
        string inspector_user_id FK
        string form_number
        string evaluator_name
        string department
        string municipality
        float latitude
        float longitude
        string address
        string building_name
        enum habitability
        enum damage_level
        enum occupation_status
        string final_comments
    }
    INSPECTION_THREAT_TYPE {
        string id PK
        string inspection_id FK
        string threat_code
        string other_text
    }
    INSPECTION_ELEMENT_DAMAGE {
        string id PK
        string inspection_id FK
        enum category "ESTRUCTURAL | NO_ESTRUCTURAL"
        string element_code
        enum severity "NL | M | S"
    }
    DAMAGE_RECORD {
        string id PK
        string inspection_id FK
        string element_damage_id FK
        string element_label
        string location
        string damage_type
        string description
        enum severity
        string recommendation
    }
    PHOTO {
        string id PK
        string inspection_id FK
        string damage_record_id FK
        enum kind "PANORAMICA | DANIO | ESQUEMA_PLANTA | ESQUEMA_ELEVACION | FIRMA"
        string url
        float latitude
        float longitude
    }
```

## Notas de diseño

* **Catálogos vs. captura de campo**: los catálogos cerrados del formulario (amenazas, usos, sistemas
  estructurales, elementos, recomendaciones) **no** son tablas de base de datos — viven como datos
  estáticos versionados en código (`src/domain/catalog.ts`), porque a diferencia de una metodología de
  índice ponderado (p.ej. WABIM) no hay coeficientes numéricos configurables que un administrador deba
  recalibrar. Las tablas `inspection_*` son la *captura de campo* real.
* **Checklist oficial vs. extensión aditiva**: `inspection_element_damages` (secciones 9-10) es el
  checklist de severidad N/L·M·S del formulario impreso. `damage_records` es una extensión aditiva
  (pedida en los requerimientos funcionales, no en el formulario impreso) que permite adjuntar fotos y
  descripción a un elemento ya marcado M o S — ver `docs/ANALISIS-Y-ARQUITECTURA.md` §3, ambigüedad A4.
* **Un solo campo de clasificación**: `habitability` / `damage_level` representan el mismo dato que el
  formulario impreso muestra dos veces (secciones 2 y 12) — ver ambigüedad A3.
