// Copia archivos estáticos que `tsc` no procesa (SQL crudo) hacia dist/, para
// que `npm start` (que corre sobre dist/, sin tsx) encuentre el esquema.
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname } from "node:path";

const copies = [["src/db/schema.sql", "dist/db/schema.sql"]];

for (const [from, to] of copies) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`copiado: ${from} -> ${to}`);
}
