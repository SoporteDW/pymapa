#!/usr/bin/env bun
/**
 * CLI del pipeline industrial de conocimiento.
 *
 *   bun run knowledge:pipeline              → ejecuta el lote y reporta
 *   bun run knowledge:pipeline -- --write   → regenera manifest y reportes
 *   bun run knowledge:validate              → modo CI: falla si algo no cuadra
 *
 * Se ejecuta con el repositorio y nada más: sin prompts, sin estado externo.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  buildBatchSummaryMarkdown,
  buildCapabilityManifest,
  buildGovernanceReviewReport,
  discoverCapabilityPipelineInputs,
  listMasterVersions,
  loadCanonicalBaselines,
  loadMasterIndex,
  loadTransversalIndex,
  loadTransversalRegistries,
  runBatch,
  validateCanonicalBaseline,
  validateMasterIndex,
  validateTransversalCore,
  verifySelfChecksum,
} from "@pymapa/knowledge-pipeline";

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const escribir = args.has("--write");
const estricto = args.has("--check") || args.has("--ci");

const MANIFEST_PATH = join("knowledge", "manifest.json");
const REPORTS_DIR = join("knowledge", "reports");

let fallos = 0;
const problema = (mensaje: string) => {
  fallos += 1;
  console.error(`✗ ${mensaje}`);
};

const versiones = listMasterVersions(ROOT);
if (versiones.length === 0) {
  problema("no existe ninguna versión de Knowledge Master en knowledge/master/");
  process.exit(1);
}

for (const version of versiones) {
  console.log(`\n=== Knowledge Master ${version} ===`);
  const bruto = loadMasterIndex(ROOT, version) as Record<string, unknown>;
  const checksum = verifySelfChecksum(bruto);
  if (!checksum.ok) {
    problema(`${version}: checksum del Master inválido (esperado ${checksum.expected})`);
  }
  const master = validateMasterIndex(bruto);
  if (!master.ok) {
    master.issues.forEach((i) => problema(`${version} master.json ${i.path}: ${i.message}`));
    continue;
  }

  const indiceTransversal = loadTransversalIndex(ROOT, version);
  if (indiceTransversal === undefined) {
    console.log("· sin núcleo transversal materializado en esta versión de Master");
  } else {
    const registros = loadTransversalRegistries(ROOT, version);
    const checksumIndice = verifySelfChecksum(indiceTransversal as Record<string, unknown>);
    if (!checksumIndice.ok) {
      problema(
        `${version}: checksum del índice transversal inválido (esperado ${checksumIndice.expected})`,
      );
    }
    const nucleo = validateTransversalCore({ index: indiceTransversal, registries: registros });
    nucleo.issues.forEach((i) => problema(`${version} transversal ${i.path}: ${i.message}`));
    console.log(
      `Transversal: ${nucleo.summary.registryCount} registros · ${nucleo.summary.recoveredIdCount} IDs recuperados · ${nucleo.summary.gapCount} gaps (${nucleo.summary.notRecoveredGapCount} SOURCE_CONTENT_NOT_RECOVERED, ${nucleo.summary.genericRuntimeExtensionCount} GENERIC_RUNTIME_EXTENSION_REQUIRED) · ${nucleo.summary.crossStageDifferenceCount} diferencias cross-stage`,
    );
    nucleo.summary.stages.forEach((e) =>
      console.log(
        `  · ${e.stage}: ${e.registryCount} registros, ${e.recoveredIdCount} IDs, ${e.gapCount} gaps`,
      ),
    );
  }

  for (const cb of loadCanonicalBaselines(ROOT, version)) {
    const checksumBaseline = verifySelfChecksum(cb.baseline as Record<string, unknown>);
    if (!checksumBaseline.ok) {
      problema(
        `${cb.capabilityDir}: checksum de baseline canónica inválido (esperado ${checksumBaseline.expected})`,
      );
    }
    const v = validateCanonicalBaseline({
      baseline: cb.baseline,
      rawText: cb.rawText,
      rawBytes: cb.rawBytes,
      source: cb.source as Parameters<typeof validateCanonicalBaseline>[0]["source"],
    });
    v.issues.forEach((i) => problema(`${cb.capabilityDir} baseline ${i.code} ${i.path}: ${i.message}`));
    if (v.summary) {
      console.log(
        `Baseline canónica ${v.summary.capabilityId} (${v.summary.baselineId}): ${v.summary.objectCount} objetos · ${v.summary.supersessionCount} supersesiones · ${v.summary.gapCount} gaps (${v.summary.genericRuntimeExtensionCount} GENERIC_RUNTIME_EXTENSION_REQUIRED, ${v.summary.notExplicitCount} NOT_EXPLICIT) · conteos de control ${v.summary.controlCounts.filter((c) => c.declared === c.materialized).length}/${v.summary.controlCounts.length}`,
      );
    }
  }

  const entradas = discoverCapabilityPipelineInputs(ROOT, version);
  for (const entrada of entradas) {
    const fuente = entrada.source as Record<string, unknown>;
    const c = verifySelfChecksum(fuente);
    if (!c.ok) {
      problema(
        `${(fuente["capability"] as { id?: string } | undefined)?.id}: checksum de fuente inválido (esperado ${c.expected})`,
      );
    }
  }

  const lote = runBatch(entradas);
  console.log(buildBatchSummaryMarkdown(lote.summary));
  console.log(
    `PASS=${lote.counts.PASS} REVIEW_REQUIRED=${lote.counts.REVIEW_REQUIRED} FAIL=${lote.counts.FAIL}`,
  );

  lote.results.forEach((resultado) => {
    resultado.errors.forEach((e) => problema(`${resultado.capabilityId}: ${e}`));
    (resultado.publication?.blockers ?? [])
      .filter((b) => b.code !== "GOVERNANCE_REVIEW_PENDING")
      .forEach((b) => console.log(`  · ${resultado.capabilityId} bloqueo ${b.code}: ${b.message}`));
    if (resultado.outcome === "FAIL") problema(`${resultado.capabilityId}: FAIL`);
  });

  const manifest = buildCapabilityManifest({ master: master.value, results: lote.results });
  console.log(
    `Manifest: ${manifest.registeredCapabilityCount}/${manifest.expectedCapabilityCount} capacidades con fuente; señal ${manifest.signal}`,
  );

  const serializado = `${JSON.stringify(manifest, null, 2)}\n`;
  if (escribir) {
    writeFileSync(join(ROOT, MANIFEST_PATH), serializado);
    mkdirSync(join(ROOT, REPORTS_DIR), { recursive: true });
    lote.results.forEach((resultado) => {
      writeFileSync(
        join(ROOT, REPORTS_DIR, `${resultado.capabilityId}.review.md`),
        buildGovernanceReviewReport(resultado),
      );
    });
    console.log(`Escritos ${MANIFEST_PATH} y ${REPORTS_DIR}/`);
  } else if (estricto) {
    const ruta = join(ROOT, MANIFEST_PATH);
    if (!existsSync(ruta))
      problema("falta knowledge/manifest.json: ejecuta el pipeline con --write");
    else if (readFileSync(ruta, "utf8") !== serializado) {
      problema("knowledge/manifest.json está desactualizado: ejecuta el pipeline con --write");
    }
  }
}

if (fallos > 0) {
  console.error(`\n${fallos} problema(s) detectado(s).`);
  process.exit(1);
}
console.log("\n✓ pipeline de conocimiento sin problemas");
