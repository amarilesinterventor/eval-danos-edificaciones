// Copia archivos estáticos que `tsc` no procesa (SQL crudo) hacia dist/, para
// que `npm start` (que corre sobre dist/, sin tsx) encuentre el esquema.
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname } from "node:path";

const copies = [
  ["src/db/schema.sql", "dist/db/schema.sql"],
  // Base del PDF "formato oficial" (réplica exacta diligenciada) — ver
  // src/server/reportPdfOficial.ts. Necesaria en tiempo de ejecución, no
  // solo en desarrollo, así que debe copiarse a dist/ igual que schema.sql.
  ["assets/official-form/2a-formulario-regional-homogenizado.pdf", "dist/assets/official-form/2a-formulario-regional-homogenizado.pdf"],
];

for (const [from, to] of copies) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`copiado: ${from} -> ${to}`);
}
