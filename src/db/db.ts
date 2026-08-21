/**
 * Capa de persistencia del servidor de demostración — mismo patrón que
 * `wabim-bridges/src/db/db.ts`: `node:sqlite` nativo (Node >= 22.5), sin
 * dependencias externas. El esquema relacional es un espejo funcional de
 * `prisma/schema.prisma` (modelo PostgreSQL objetivo de producción — ver
 * docs/ANALISIS-Y-ARQUITECTURA.md §4). Para migrar, se reescribe solo este
 * módulo y queries.ts usando `PrismaClient`; el resto de la aplicación
 * (src/domain, rutas HTTP, frontend) no cambia.
 */
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = join(DATA_DIR, "edificaciones.sqlite");

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");

const schemaSql = readFileSync(join(__dirname, "schema.sql"), "utf-8");
db.exec(schemaSql);

/**
 * Migración aditiva mínima: `CREATE TABLE IF NOT EXISTS` (arriba) no agrega
 * columnas nuevas a una tabla que ya existe -- hasta ahora no hacía falta
 * nada más porque el nivel gratis de Render no tenía disco persistente (la
 * base de datos se recreaba de cero en cada redeploy), pero con disco
 * persistente ya sí puede haber una base de datos real más vieja que el
 * esquema actual. `ensureColumn` es idempotente y segura de llamar en cada
 * arranque -- no reemplaza un sistema de migraciones real (ver
 * docs/DESPLIEGUE.md, sección PostgreSQL/Prisma para producción a mayor
 * escala), pero alcanza para agregar columnas sueltas sin perder datos.
 */
function ensureColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("inspections", "inspector_signature", "TEXT");
ensureColumn("inspections", "occupant_signature", "TEXT");

export function newId(): string {
  return randomUUID();
}

/** Ejecuta `fn` como una transacción SQLite (BEGIN/COMMIT/ROLLBACK). */
export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
