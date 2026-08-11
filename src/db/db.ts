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
