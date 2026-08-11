import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestClassification } from "./classification.js";
import type { ClassificationInput } from "./types.js";

const base: ClassificationInput = {
  totalCollapse: "NO",
  partialCollapse: "NO",
  evidentTilt: "NO",
  adjacentBuildingRisk: "NO",
  soilLiquefaction: "NO",
  nearbyLandslides: "NO",
  elementDamages: [],
};

test("sin indicadores de peligro => Verde / Ninguno-Menor", () => {
  const r = suggestClassification(base);
  assert.equal(r.habitability, "VERDE");
  assert.equal(r.damageLevel, "NINGUNO_MENOR");
});

test("colapso total = Sí => Rojo / Severo", () => {
  const r = suggestClassification({ ...base, totalCollapse: "SI" });
  assert.equal(r.habitability, "ROJO");
  assert.equal(r.damageLevel, "SEVERO");
  assert.ok(r.reasons.some((x) => x.includes("Colapso total")));
});

test("severidad Severo en columnas (elemento crítico) => Rojo", () => {
  const r = suggestClassification({
    ...base,
    elementDamages: [{ id: "1", elementCode: "COLUMNAS", category: "ESTRUCTURAL", severity: "S" }],
  });
  assert.equal(r.habitability, "ROJO");
});

test("severidad Severo en vigas (elemento secundario) => Amarillo, no Rojo", () => {
  const r = suggestClassification({
    ...base,
    elementDamages: [{ id: "1", elementCode: "VIGAS", category: "ESTRUCTURAL", severity: "S" }],
  });
  assert.equal(r.habitability, "AMARILLO");
});

test("severidad Moderado en columnas => Amarillo", () => {
  const r = suggestClassification({
    ...base,
    elementDamages: [{ id: "1", elementCode: "COLUMNAS", category: "ESTRUCTURAL", severity: "M" }],
  });
  assert.equal(r.habitability, "AMARILLO");
  assert.equal(r.damageLevel, "MODERADO");
});

test("colapso parcial = No es claro => escala a Amarillo", () => {
  const r = suggestClassification({ ...base, partialCollapse: "NO_ES_CLARO" });
  assert.equal(r.habitability, "AMARILLO");
});

test("licuación del terreno => Rojo aunque no haya daño en elementos", () => {
  const r = suggestClassification({ ...base, soilLiquefaction: "SI" });
  assert.equal(r.habitability, "ROJO");
  assert.equal(r.damageLevel, "SEVERO");
});
