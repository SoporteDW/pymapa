#!/usr/bin/env bun
/**
 * CLI de la Knowledge Factory por lotes (M2-FACTORY-01).
 *
 *   bun run knowledge:factory                     → evalúa el lote y reporta
 *   bun run knowledge:factory -- --write          → escribe dossiers, batch manifest y benchmark
 *   bun run knowledge:factory -- --check          → CI: falla si hay FAIL o artefactos desactualizados
 *   bun run knowledge:factory -- register --capability XX-00 --domain XX --file <ruta> [--marker "<texto literal>"]
 *   bun run knowledge:factory -- promote --capability XX-00
 *
 * La Factory no publica, no aprueba y no genera identidad humana.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { ENGINE_SEMANTIC_HISTORY, ENGINE_SEMVER, ENGINE_VERSION } from "@pymapa/knowledge-engine";
import {
  BATCH_MANIFEST_PATH,
  BENCHMARK_PATH,
  INTAKE_DIR,
  MASTER_DIR,
  RUNTIME_EXTENSIONS_PATH,
  buildFactoryBenchmarkMarkdown,
  buildRawSourceRegistration,
  extractRawSource,
  governanceEvidencePath,
  loadFactoryCapabilityInputs,
  loadGenericCodeCorpus,
  loadMasterIndex,
  promoteCandidateToCanonicalBaseline,
  rawSourceRegistrationSchema,
  sha256Bytes,
  validateExtractionCandidate,
  validateMasterIndex,
  validateRuntimeExtensionRegistry,
  runFactoryBatch,
  type PdfTextRunner,
} from "@pymapa/knowledge-pipeline";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(n);
const opt = (n: string) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : undefined;
};
const MASTER_VERSION = opt("--master") ?? "v1.0";

const pdfRunner: PdfTextRunner = {
  version() {
    const r = spawnSync("pdftotext", ["-v"], { encoding: "utf8" });
    if (r.error) return null;
    const m = /pdftotext version ([\d.]+)/.exec(`${r.stdout}${r.stderr}`);
    return m?.[1] ?? null;
  },
  extract(bytes) {
    const dir = mkdtempSync(join(tmpdir(), "pymapa-pdf-"));
    try {
      const f = join(dir, "in.pdf");
      writeFileSync(f, bytes);
      const r = spawnSync("pdftotext", ["-enc", "UTF-8", "-eol", "unix", f, "-"], {
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
      });
      if (r.status !== 0) throw new Error(`pdftotext falló: ${r.stderr}`);
      return r.stdout;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
};

const readJson = (p: string) => JSON.parse(readFileSync(join(ROOT, p), "utf8")) as unknown;
const writeJson = (p: string, v: unknown) => {
  mkdirSync(join(ROOT, p, ".."), { recursive: true });
  writeFileSync(join(ROOT, p), `${JSON.stringify(v, null, 2)}\n`);
};

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

/* ---------------------------- register ---------------------------- */
if (argv[0] === "register") {
  const capabilityId = opt("--capability") ?? fail("--capability requerido");
  const domainId = opt("--domain") ?? fail("--domain requerido");
  const file = opt("--file") ?? fail("--file requerido");
  const marker = opt("--marker") ?? null;
  const master = validateMasterIndex(loadMasterIndex(ROOT, MASTER_VERSION));
  if (!master.ok) fail("master.json inválido");
  const bytes = new Uint8Array(readFileSync(file));
  const filename = basename(file);
  const dir = join(INTAKE_DIR, capabilityId);
  const originalRef = join("original", filename);
  const textRef = join("text", `${basename(filename, extname(filename))}.txt`);
  const regPath = join(dir, "registration.json");
  if (existsSync(join(ROOT, regPath))) {
    const prev = rawSourceRegistrationSchema.safeParse(readJson(regPath));
    if (prev.success && prev.data.original.sha256 === sha256Bytes(bytes)) {
      console.log(
        `✓ ${capabilityId} ya registrado con el mismo original (${prev.data.registrationId}); sin cambios`,
      );
      process.exit(0);
    }
    fail(
      `${regPath} ya existe con otro original: un registro es inmutable; retirar explícitamente el registro anterior antes de registrar una nueva fuente`,
    );
  }
  const extraction = extractRawSource({ filename, bytes, pdfRunner });
  mkdirSync(join(ROOT, dir, "original"), { recursive: true });
  mkdirSync(join(ROOT, dir, "text"), { recursive: true });
  copyFileSync(file, join(ROOT, dir, originalRef));
  if (extraction.text !== null) writeFileSync(join(ROOT, dir, textRef), extraction.text);
  const registration = buildRawSourceRegistration({
    capabilityId,
    domainId,
    masterVersion: master.value.version,
    filename,
    originalRef,
    textRef,
    bytes,
    extraction,
    historicalMarker: marker,
    registeredAt: opt("--registered-at") ?? new Date().toISOString().slice(0, 10),
  });
  writeJson(regPath, registration);
  console.log(
    `✓ registrado ${registration.registrationId}: ${registration.original.byteLength} bytes, ${registration.text?.lineCount ?? 0} líneas, ${registration.outline.length} headings`,
  );
  registration.extraction.warnings.forEach((w) => console.log(`  · ${w}`));
  process.exit(0);
}

/* ---------------------------- promote ----------------------------- */
if (argv[0] === "promote") {
  const capabilityId = opt("--capability") ?? fail("--capability requerido");
  const dir = join(INTAKE_DIR, capabilityId);
  const reg = rawSourceRegistrationSchema.parse(readJson(join(dir, "registration.json")));
  if (!reg.text) fail("registro sin texto");
  const rawText = readFileSync(join(ROOT, dir, reg.text.ref), "utf8");
  const registry = validateRuntimeExtensionRegistry({
    registry: readJson(RUNTIME_EXTENSIONS_PATH),
    engineSemver: ENGINE_SEMVER,
    engineChangeIds: ENGINE_SEMANTIC_HISTORY.flatMap((v) => v.changes.map((c) => c.id)),
  });
  const validation = validateExtractionCandidate({
    candidate: readJson(join(dir, "candidate.json")),
    registration: reg,
    rawText,
    extensionRegistry: registry.registry,
  });
  const acceptancePath = join(dir, "canonical-acceptance.json");
  const target = join(MASTER_DIR, MASTER_VERSION, "capabilities", capabilityId);
  const rawRef = join("raw", basename(reg.text.ref));
  const prom = promoteCandidateToCanonicalBaseline({
    validation,
    acceptance: existsSync(join(ROOT, acceptancePath)) ? readJson(acceptancePath) : undefined,
    registration: reg,
    rawRef,
    sourceRef: "source.json",
  });
  if (!prom.ok) {
    prom.reasons.forEach((r) => console.error(`  · ${r}`));
    fail(`${capabilityId}: promoción bloqueada`);
  }
  if (existsSync(join(ROOT, target, "canonical-baseline.json")))
    fail(
      `${target}/canonical-baseline.json ya existe; las correcciones se registran como transcriptionCorrections`,
    );
  mkdirSync(join(ROOT, target, "raw"), { recursive: true });
  copyFileSync(join(ROOT, dir, reg.text.ref), join(ROOT, target, rawRef));
  writeJson(join(target, "canonical-baseline.json"), prom.baseline);
  console.log(
    `✓ baseline canónica ${prom.baseline.baselineId} materializada en ${target}; siguiente paso: proyección ejecutable source.json + fixtures`,
  );
  process.exit(0);
}

/* ------------------------------ batch ----------------------------- */
const escribir = flag("--write");
const estricto = flag("--check") || flag("--ci");
const master = validateMasterIndex(loadMasterIndex(ROOT, MASTER_VERSION));
if (!master.ok) fail(`master.json inválido: ${master.issues.map((i) => i.message).join("; ")}`);
const engine = {
  semver: ENGINE_SEMVER,
  version: ENGINE_VERSION,
  changeIds: ENGINE_SEMANTIC_HISTORY.flatMap((v) => v.changes.map((c) => c.id)),
  baselineSemver: ENGINE_SEMANTIC_HISTORY[0]?.version ?? "0.1.0",
};
const run = () =>
  runFactoryBatch({
    master: master.value,
    capabilities: loadFactoryCapabilityInputs(ROOT, MASTER_VERSION),
    extensionRegistry: existsSync(join(ROOT, RUNTIME_EXTENSIONS_PATH))
      ? readJson(RUNTIME_EXTENSIONS_PATH)
      : { entries: [] },
    codeCorpus: loadGenericCodeCorpus(ROOT),
    engine,
    pdfRunner,
    now: () => performance.now(),
  });

let result = run();
if (escribir) {
  for (const [id, d] of result.dossiers) writeJson(governanceEvidencePath(id), d);
  result = run();
  writeJson(BATCH_MANIFEST_PATH, result.manifest);
  mkdirSync(join(ROOT, BENCHMARK_PATH, ".."), { recursive: true });
  writeFileSync(join(ROOT, BENCHMARK_PATH), buildFactoryBenchmarkMarkdown(result));
  console.log(
    `Escritos ${BATCH_MANIFEST_PATH}, ${BENCHMARK_PATH} y ${result.dossiers.size} dossier(s) de evidencia`,
  );
}

let fallos = 0;
const problema = (m: string) => {
  fallos += 1;
  console.error(`✗ ${m}`);
};
console.log(`\n=== Knowledge Factory · ${ENGINE_VERSION} · Master ${MASTER_VERSION} ===`);
for (const e of result.entries) {
  console.log(
    `${e.capabilityId}  ${e.state.padEnd(26)} ${e.outcome.padEnd(16)} ${(result.durationsMs.get(e.capabilityId) ?? 0).toFixed(0)} ms`,
  );
  e.reasons
    .filter((r) => r.severity !== "INFO")
    .forEach((r) =>
      console.log(`   · ${r.severity} ${r.check}/${r.code}: ${r.message} → ${r.action}`),
    );
  if (e.outcome === "FAIL") problema(`${e.capabilityId}: FAIL`);
}
const d = result.dossiers;
for (const [id, dossier] of d)
  console.log(
    `Dossier ${id}: ${dossier.readiness}${dossier.blockers.length ? ` (${dossier.blockers.length} bloqueo(s))` : ""}`,
  );
console.log(
  `Slots sin fuente: ${result.manifest.unregisteredSlotCount}/${result.manifest.expectedCapabilityCount} · señal ${result.manifest.signal}`,
);
result.batchIssues.forEach((i) => problema(`lote: ${i}`));

if (estricto && !escribir) {
  const esperado = `${JSON.stringify(result.manifest, null, 2)}\n`;
  if (
    !existsSync(join(ROOT, BATCH_MANIFEST_PATH)) ||
    readFileSync(join(ROOT, BATCH_MANIFEST_PATH), "utf8") !== esperado
  )
    problema(`${BATCH_MANIFEST_PATH} desactualizado: bun run knowledge:factory -- --write`);
  if (
    !existsSync(join(ROOT, BENCHMARK_PATH)) ||
    readFileSync(join(ROOT, BENCHMARK_PATH), "utf8") !== buildFactoryBenchmarkMarkdown(result)
  )
    problema(`${BENCHMARK_PATH} desactualizado: bun run knowledge:factory -- --write`);
  result.entries
    .filter((e) => e.governance.evidence === "MISSING" || e.governance.evidence === "OUTDATED")
    .forEach((e) => problema(`${e.capabilityId}: dossier de evidencia ${e.governance.evidence}`));
}

if (fallos > 0) {
  console.error(`\n${fallos} problema(s).`);
  process.exit(1);
}
console.log("\n✓ Knowledge Factory sin FAIL");
