/**
 * Servidor HTTP — Formulario Regional para Evaluación Rápida de Daños en
 * Edificaciones. Node.js puro (`node:http`, sin framework), mismo patrón que
 * `wabim-bridges/src/server/server.ts` — ver docs/ANALISIS-Y-ARQUITECTURA.md §4.
 *
 * Expone la API JSON en /api/* y el frontend estático (HTML/CSS/JS vanilla +
 * PWA) en /public.
 *
 * Sin autenticación por decisión explícita del usuario: el inspector abre la
 * herramienta y empieza a trabajar de inmediato, sin cuentas ni contraseñas.
 * `src/server/auth.ts` y la tabla `users` quedan en el código como base para
 * un futuro control de acceso multi-inspector/administrador (ver
 * docs/ANALISIS-Y-ARQUITECTURA.md §29 "Escalabilidad futura"), pero ninguna
 * ruta los exige hoy.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { getFullCatalog } from "../domain/catalog.js";
import { suggestClassification } from "../domain/classification.js";
import type { ClassificationInput } from "../domain/types.js";
import {
  createInspection,
  getInspection,
  listInspections,
  updateInspectionFields,
  updateInspectionStatus,
  deleteInspection,
  replaceThreatTypes,
  replaceBuildingUses,
  replaceStructuralSystems,
  replaceFloorSystems,
  replaceRoofSupportSystems,
  replaceRoofTypes,
  replaceSafetyRecommendations,
  upsertElementDamage,
  deleteElementDamage,
  addDamageRecord,
  updateDamageRecord,
  deleteDamageRecord,
  listPhotoUrlsForDamageRecord,
  addPhoto,
  getPhoto,
  deletePhoto,
  getDashboardStats,
} from "../db/queries.js";
import { main as runSeed } from "../db/seed.js";
import { buildInspectionReportPdf } from "./reportPdf.js";
import { buildOfficialReportPdf } from "./reportPdfOficial.js";
import { buildInspectionReportCsv } from "./reportCsv.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "..", "public");
const UPLOADS_DIR = join(PUBLIC_DIR, "uploads");
const PORT = Number(process.env.PORT ?? 4100);

const DATA_URL_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Decodifica un data URL "data:image/xxx;base64,..." y lo guarda en disco bajo /uploads/<inspectionId>. */
async function saveDataUrlPhoto(dataUrl: string, subdir: string): Promise<string> {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Formato de imagen inválido: se esperaba un data URL 'data:image/...;base64,...'.");
  const [, mime, base64] = match;
  const ext = DATA_URL_EXT[mime];
  if (!ext) throw new Error(`Tipo de imagen no soportado: '${mime}'.`);
  const dir = join(UPLOADS_DIR, subdir);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(join(dir, filename), Buffer.from(base64, "base64"));
  return `/uploads/${subdir}/${filename}`;
}

type Handler = (req: IncomingMessage, res: ServerResponse, params: Record<string, string>, body: any) => void | Promise<void>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
}

const routes: Route[] = [];

function addRoute(method: string, path: string, handler: Handler) {
  const paramNames: string[] = [];
  const patternStr = path.replace(/:([a-zA-Z]+)/g, (_, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  routes.push({ method, pattern: new RegExp(`^${patternStr}$`), paramNames, handler });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

const MAX_BODY_BYTES = 15 * 1024 * 1024; // 15 MB — margen holgado para una foto en base64

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = "";
    let bytes = 0;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("La solicitud excede el tamaño máximo permitido (15 MB)."));
        return;
      }
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("JSON inválido en el cuerpo de la solicitud."));
      }
    });
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Rutas: Catálogo (listas cerradas del formulario — estáticas, ver src/domain/catalog.ts)
// ---------------------------------------------------------------------------
addRoute("GET", "/api/catalog", (req, res) => sendJson(res, 200, getFullCatalog()));

// ---------------------------------------------------------------------------
// Rutas: Dashboard
// ---------------------------------------------------------------------------
addRoute("GET", "/api/dashboard/stats", (req, res) => sendJson(res, 200, getDashboardStats()));

// ---------------------------------------------------------------------------
// Rutas: Inspecciones
// ---------------------------------------------------------------------------
addRoute("GET", "/api/inspections", (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const status = url.searchParams.get("status") ?? undefined;
  sendJson(res, 200, { inspections: listInspections({ status }) });
});

addRoute("POST", "/api/inspections", (req, res, _params, body) => {
  const inspection = createInspection(null, body ?? {});
  sendJson(res, 201, { inspection });
});

addRoute("GET", "/api/inspections/:id", (req, res, params) => {
  const inspection = getInspection(params.id);
  if (!inspection) return sendJson(res, 404, { error: "Inspección no encontrada." });
  sendJson(res, 200, { inspection });
});

addRoute("PATCH", "/api/inspections/:id", (req, res, params, body) => {
  const inspection = updateInspectionFields(params.id, body ?? {});
  if (!inspection) return sendJson(res, 404, { error: "Inspección no encontrada." });
  sendJson(res, 200, { inspection });
});

addRoute("DELETE", "/api/inspections/:id", async (req, res, params) => {
  const inspection = getInspection(params.id);
  if (!inspection) return sendJson(res, 404, { error: "Inspección no encontrada." });
  const photoUrls = [...(inspection.photos ?? []).map((p: any) => p.url), ...(inspection.damageRecords ?? []).flatMap((d: any) => d.photos.map((p: any) => p.url))];
  deleteInspection(params.id);
  for (const url of photoUrls) {
    try {
      await unlink(join(PUBLIC_DIR, url));
    } catch {
      // El archivo ya no existe en disco; no es un error fatal.
    }
  }
  sendJson(res, 200, { ok: true });
});

addRoute("POST", "/api/inspections/:id/status", (req, res, params, body) => {
  const inspection = updateInspectionStatus(params.id, body.status);
  if (!inspection) return sendJson(res, 404, { error: "Inspección no encontrada." });
  sendJson(res, 200, { inspection });
});

// --- Grupos de selección múltiple (secciones 1, 4, 5.1-5.4, 14) -------------
addRoute("PUT", "/api/inspections/:id/threat-types", (req, res, params, body) => {
  replaceThreatTypes(params.id, body.items ?? []);
  sendJson(res, 200, { ok: true });
});
addRoute("PUT", "/api/inspections/:id/building-uses", (req, res, params, body) => {
  replaceBuildingUses(params.id, body.items ?? []);
  sendJson(res, 200, { ok: true });
});
addRoute("PUT", "/api/inspections/:id/structural-systems", (req, res, params, body) => {
  replaceStructuralSystems(params.id, body.items ?? []);
  sendJson(res, 200, { ok: true });
});
addRoute("PUT", "/api/inspections/:id/floor-systems", (req, res, params, body) => {
  replaceFloorSystems(params.id, body.items ?? []);
  sendJson(res, 200, { ok: true });
});
addRoute("PUT", "/api/inspections/:id/roof-support-systems", (req, res, params, body) => {
  replaceRoofSupportSystems(params.id, body.items ?? []);
  sendJson(res, 200, { ok: true });
});
addRoute("PUT", "/api/inspections/:id/roof-types", (req, res, params, body) => {
  replaceRoofTypes(params.id, body.items ?? []);
  sendJson(res, 200, { ok: true });
});
addRoute("PUT", "/api/inspections/:id/safety-recommendations", (req, res, params, body) => {
  replaceSafetyRecommendations(params.id, body.items ?? []);
  sendJson(res, 200, { ok: true });
});

// --- Secciones 9-10: daño por elemento (checklist oficial) -------------------
addRoute("PUT", "/api/inspections/:id/element-damages/:elementCode", (req, res, params, body) => {
  const record = upsertElementDamage(params.id, {
    elementCode: params.elementCode,
    category: body.category,
    severity: body.severity,
    otherLabel: body.otherLabel,
  });
  sendJson(res, 200, { elementDamage: record });
});
addRoute("DELETE", "/api/inspections/:id/element-damages/:elementCode", (req, res, params) => {
  deleteElementDamage(params.id, params.elementCode);
  sendJson(res, 200, { ok: true });
});

// --- Motor de sugerencia de clasificación (ver src/domain/classification.ts) --
addRoute("POST", "/api/inspections/:id/classify", (req, res, params) => {
  const inspection = getInspection(params.id);
  if (!inspection) return sendJson(res, 404, { error: "Inspección no encontrada." });
  const input: ClassificationInput = {
    totalCollapse: inspection.total_collapse,
    partialCollapse: inspection.partial_collapse,
    evidentTilt: inspection.evident_tilt,
    adjacentBuildingRisk: inspection.adjacent_building_risk,
    soilLiquefaction: inspection.soil_liquefaction,
    nearbyLandslides: inspection.nearby_landslides,
    elementDamages: (inspection.elementDamages as any[]).map((d) => ({
      id: d.id,
      elementCode: d.element_code,
      category: d.category,
      severity: d.severity,
    })),
  };
  const suggestion = suggestClassification(input);
  updateInspectionFields(params.id, {
    habitabilitySuggested: suggestion.habitability,
    damageLevelSuggested: suggestion.damageLevel,
  });
  sendJson(res, 200, { suggestion });
});

// --- Extensión: registro de daño individual con foto/descripción (ver A4) ----
addRoute("POST", "/api/inspections/:id/damage-records", (req, res, params, body) => {
  const record = addDamageRecord(params.id, body ?? {});
  sendJson(res, 201, { damageRecord: record });
});
addRoute("PATCH", "/api/damage-records/:id", (req, res, params, body) => {
  const record = updateDamageRecord(params.id, body ?? {});
  sendJson(res, 200, { damageRecord: record });
});
addRoute("DELETE", "/api/damage-records/:id", async (req, res, params) => {
  const photoUrls = listPhotoUrlsForDamageRecord(params.id);
  deleteDamageRecord(params.id);
  for (const url of photoUrls) {
    try {
      await unlink(join(PUBLIC_DIR, url));
    } catch {
      // El archivo ya no existe en disco; no es un error fatal.
    }
  }
  sendJson(res, 200, { ok: true });
});

// --- Fotos --------------------------------------------------------------------
addRoute("POST", "/api/inspections/:id/photos", async (req, res, params, body) => {
  try {
    const url = await saveDataUrlPhoto(body.dataUrl, params.id);
    const photo = addPhoto({
      id: body.id,
      inspectionId: params.id,
      damageRecordId: body.damageRecordId || null,
      kind: body.kind || "PANORAMICA",
      url,
      caption: body.caption,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      takenAt: body.takenAt ?? null,
    });
    sendJson(res, 201, { photo });
  } catch (err: any) {
    sendJson(res, 400, { error: err.message ?? String(err) });
  }
});

addRoute("DELETE", "/api/photos/:id", async (req, res, params) => {
  const photo = getPhoto(params.id);
  if (!photo) return sendJson(res, 404, { error: "Foto no encontrada." });
  deletePhoto(params.id);
  try {
    await unlink(join(PUBLIC_DIR, photo.url));
  } catch {
    // El archivo ya no existe en disco; no es un error fatal.
  }
  sendJson(res, 200, { ok: true });
});

// --- Informe PDF ----------------------------------------------------------------
addRoute("GET", "/api/inspections/:id/report.pdf", (req, res, params) => {
  try {
    const doc = buildInspectionReportPdf(params.id);
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informe-evaluacion-danos-${params.id}.pdf"`,
    });
    doc.pipe(res);
    updateInspectionStatus(params.id, "INFORME_GENERADO");
  } catch (err: any) {
    sendJson(res, 404, { error: err.message ?? String(err) });
  }
});

// --- Informe PDF en el formato oficial exacto ("2A - Formulario regional
// homogenizado") — alternativa al informe rediseñado de arriba, para cuando
// el organismo de atención de desastres exige su propio formato. El
// inspector puede generar cualquiera de los dos (o ambos) desde el paso 8.
addRoute("GET", "/api/inspections/:id/report-oficial.pdf", (req, res, params) => {
  try {
    const doc = buildOfficialReportPdf(params.id);
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="formato-oficial-2a-${params.id}.pdf"`,
    });
    doc.pipe(res);
    updateInspectionStatus(params.id, "INFORME_GENERADO");
  } catch (err: any) {
    sendJson(res, 404, { error: err.message ?? String(err) });
  }
});

// --- Exportación CSV (información estructurada de la inspección) -------------
addRoute("GET", "/api/inspections/:id/report.csv", (req, res, params) => {
  try {
    const csv = buildInspectionReportCsv(params.id);
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inspeccion-${params.id}.csv"`,
    });
    res.end(csv);
  } catch (err: any) {
    sendJson(res, 404, { error: err.message ?? String(err) });
  }
});

// ---------------------------------------------------------------------------
// Servidor HTTP: enrutamiento + archivos estáticos
// ---------------------------------------------------------------------------
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

async function serveStatic(req: IncomingMessage, res: ServerResponse) {
  let urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = normalize(join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("No encontrado");
    return;
  }
  const ext = extname(filePath);
  const contents = await readFile(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
  res.end(contents);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (!url.pathname.startsWith("/api/")) {
      return void (await serveStatic(req, res));
    }

    const method = req.method ?? "GET";
    for (const route of routes) {
      if (route.method !== method) continue;
      const match = route.pattern.exec(url.pathname);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.paramNames.forEach((name, idx) => (params[name] = decodeURIComponent(match[idx + 1])));

      const body = method === "POST" || method === "PUT" || method === "PATCH" ? await readBody(req) : {};
      await route.handler(req, res, params, body);
      return;
    }

    sendJson(res, 404, { error: `Ruta no encontrada: ${method} ${url.pathname}` });
  } catch (err: any) {
    console.error(err);
    sendJson(res, 500, { error: err.message ?? "Error interno del servidor." });
  }
});

// Auto-siembra: en hosting sin disco persistente (p.ej. el nivel gratis de
// Render) el archivo SQLite se reinicia vacío en cada despliegue/reinicio.
// Si arranca sin inspecciones, se siembra automáticamente — mismo patrón que
// wabim-bridges.
function autoSeedIfEmpty() {
  if (listInspections().length > 0) return;
  console.log("Base de datos vacía — cargando datos de ejemplo automáticamente...");
  try {
    runSeed();
  } catch (err) {
    console.error("Fallo la auto-siembra:", err);
  }
}
autoSeedIfEmpty();

server.listen(PORT, () => {
  console.log(`\n  Herramienta de Evaluación Rápida de Daños en Edificaciones`);
  console.log(`  -----------------------------------------------------------`);
  console.log(`  Interfaz web:  http://localhost:${PORT}`);
  console.log(`  API:           http://localhost:${PORT}/api`);
  console.log(`\n  Si es la primera vez, corre "npm run seed" en otra terminal (o deja que se auto-siembre).\n`);
});
