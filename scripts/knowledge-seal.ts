#!/usr/bin/env bun
/**
 * Sella la identidad de contenido del conocimiento gobernado.
 *
 *   bun run knowledge:seal            → recalcula checksums y los escribe
 *   bun run knowledge:seal -- --check → falla si algún checksum no cuadra
 *
 * Orden obligatorio: registros transversales → índice transversal → master.
 * El sellado NO interpreta semántica: solo fija identidad de contenido.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computeSelfChecksum, listMasterVersions } from "@pymapa/knowledge-pipeline";

const ROOT = process.cwd();
const soloVerificar = new Set(process.argv.slice(2)).has("--check");

let fallos = 0;
const problema = (mensaje: string) => {
  fallos += 1;
  console.error(`✗ ${mensaje}`);
};

function sellar(ruta: string): void {
  const documento = JSON.parse(readFileSync(ruta, "utf8")) as Record<string, unknown>;
  const esperado = computeSelfChecksum(documento);
  if (documento["checksum"] === esperado) return;
  if (soloVerificar) {
    problema(`${ruta}: checksum desactualizado (esperado ${esperado})`);
    return;
  }
  documento["checksum"] = esperado;
  writeFileSync(ruta, `${JSON.stringify(documento, null, 2)}\n`);
  console.log(`· sellado ${ruta}`);
}

for (const version of listMasterVersions(ROOT)) {
  const base = join(ROOT, "knowledge", "master", version);
  const transversal = join(base, "transversal");
  const registriesDir = join(transversal, "registries");

  if (existsSync(registriesDir)) {
    for (const archivo of readdirSync(registriesDir).filter((f) => f.endsWith(".json")).sort()) {
      sellar(join(registriesDir, archivo));
    }
  }

  const rutaIndice = join(transversal, "index.json");
  if (existsSync(rutaIndice)) {
    const indice = JSON.parse(readFileSync(rutaIndice, "utf8")) as Record<string, unknown>;
    const registries = indice["registries"] as { registryId: string; ref: string; checksum: string }[];
    let cambiado = false;
    for (const entrada of registries) {
      const registro = JSON.parse(readFileSync(join(transversal, entrada.ref), "utf8")) as Record<
        string,
        unknown
      >;
      const esperado = computeSelfChecksum(registro);
      if (entrada.checksum !== esperado) {
        if (soloVerificar) {
          problema(`index.json · ${entrada.registryId}: checksum declarado ≠ contenido`);
        } else {
          entrada.checksum = esperado;
          cambiado = true;
        }
      }
    }
    if (cambiado) writeFileSync(rutaIndice, `${JSON.stringify(indice, null, 2)}\n`);
    sellar(rutaIndice);
  }

  const capabilitiesDir = join(base, "capabilities");
  if (existsSync(capabilitiesDir)) {
    for (const id of readdirSync(capabilitiesDir)) {
      const ruta = join(capabilitiesDir, id, "source.json");
      if (existsSync(ruta)) sellar(ruta);
      const baseline = join(capabilitiesDir, id, "canonical-baseline.json");
      if (existsSync(baseline)) sellar(baseline);
    }
  }

  sellar(join(base, "master.json"));
}

if (fallos > 0) {
  console.error(`\n${fallos} checksum(s) desalineado(s).`);
  process.exit(1);
}
console.log("✓ identidades de contenido selladas");
