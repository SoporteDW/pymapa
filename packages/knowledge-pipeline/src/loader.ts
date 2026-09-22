/**
 * Carga desde el repositorio (node:fs). El pipeline se ejecuta con el repo y
 * nada más: sin prompts, sin estado externo, sin configuración oculta.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { computeSelfChecksum } from "./checksum.ts";
import type { CapabilityPipelineInput } from "./pipeline.ts";
import type { GovernanceReview, PublishedPackRecord } from "./publication.ts";
import type { FactoryCapabilityInput } from "./factory.ts";

export const MASTER_DIR = join("knowledge", "master");
export const PACKS_DIR = join("knowledge", "packs");
export const FIXTURES_DIR = join("knowledge", "fixtures");
export const TRANSVERSAL_DIR = "transversal";

function leerJson(ruta: string): unknown {
  return JSON.parse(readFileSync(ruta, "utf8")) as unknown;
}

function directorios(ruta: string): string[] {
  if (!existsSync(ruta)) return [];
  return readdirSync(ruta).filter((e) => statSync(join(ruta, e)).isDirectory());
}

/** Versiones de Master presentes en el repositorio (p. ej. "v1.0"). */
export function listMasterVersions(root: string): string[] {
  return directorios(join(root, MASTER_DIR)).sort();
}

export function loadMasterIndex(root: string, masterVersion: string): unknown {
  return leerJson(join(root, MASTER_DIR, masterVersion, "master.json"));
}

export function listCapabilitySourceIds(root: string, masterVersion: string): string[] {
  return directorios(join(root, MASTER_DIR, masterVersion, "capabilities")).sort();
}

export function loadCapabilitySource(
  root: string,
  masterVersion: string,
  capabilityId: string,
): unknown {
  return leerJson(
    join(root, MASTER_DIR, masterVersion, "capabilities", capabilityId, "source.json"),
  );
}

export function loadGovernanceReview(
  root: string,
  masterVersion: string,
  capabilityId: string,
): GovernanceReview | undefined {
  const ruta = join(
    root,
    MASTER_DIR,
    masterVersion,
    "capabilities",
    capabilityId,
    "governance-review.json",
  );
  if (!existsSync(ruta)) return undefined;
  return leerJson(ruta) as GovernanceReview;
}

export function loadFixtures(root: string, packId: string): unknown[] {
  const dir = join(root, FIXTURES_DIR, packId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".fixture.json"))
    .sort()
    .map((f) => leerJson(join(dir, f)));
}

export function loadPublishedPack(
  root: string,
  packId: string,
  packVersion: string,
): { record: PublishedPackRecord; pack: unknown } | undefined {
  const dir = join(root, PACKS_DIR, packId, packVersion);
  const rutaPack = join(dir, "pack.json");
  const rutaRegistro = join(dir, "published.json");
  if (!existsSync(rutaPack) || !existsSync(rutaRegistro)) return undefined;
  return {
    record: leerJson(rutaRegistro) as PublishedPackRecord,
    pack: leerJson(rutaPack),
  };
}

/**
 * Descubre por directorio todas las entradas del pipeline. No hay lista literal
 * de capacidades en el código: incorporar una capacidad es añadir contenido.
 */
export function discoverCapabilityPipelineInputs(
  root: string,
  masterVersion: string,
): CapabilityPipelineInput[] {
  const base = join(root, MASTER_DIR, masterVersion, "capabilities");
  // Una capacidad con baseline canónica aceptada pero sin proyección ejecutable
  // (source.json) aún no entra al pipeline de packs; la Factory la reporta.
  return listCapabilitySourceIds(root, masterVersion)
    .filter((capabilityId) => existsSync(join(base, capabilityId, "source.json")))
    .map((capabilityId) => {
    const source = loadCapabilitySource(root, masterVersion, capabilityId) as {
      targetPack?: { packId?: string; packVersion?: string };
    };
    const packId = source.targetPack?.packId ?? "";
    const packVersion = source.targetPack?.packVersion ?? "";
    const review = loadGovernanceReview(root, masterVersion, capabilityId);
    const publicado =
      packId && packVersion ? loadPublishedPack(root, packId, packVersion) : undefined;
    return {
      source,
      fixtures: packId ? loadFixtures(root, packId) : [],
      ...(review ? { governanceReview: review } : {}),
      ...(publicado ? { publishedPack: publicado } : {}),
    } satisfies CapabilityPipelineInput;
  });
}

/** Índice del núcleo transversal (S1–S5), si está materializado. */
export function loadTransversalIndex(root: string, masterVersion: string): unknown | undefined {
  const ruta = join(root, MASTER_DIR, masterVersion, TRANSVERSAL_DIR, "index.json");
  if (!existsSync(ruta)) return undefined;
  return leerJson(ruta);
}

/**
 * Registros transversales por descubrimiento de directorio. El checksum se
 * calcula del contenido: el índice no puede declarar una identidad distinta.
 */
export function loadTransversalRegistries(
  root: string,
  masterVersion: string,
): { ref: string; raw: unknown; checksum: string }[] {
  const dir = join(root, MASTER_DIR, masterVersion, TRANSVERSAL_DIR, "registries");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const raw = leerJson(join(dir, f)) as Record<string, unknown>;
      return { ref: `${TRANSVERSAL_DIR}/registries/${f}`, raw, checksum: computeSelfChecksum(raw) };
    });
}

/**
 * Baselines canónicas por descubrimiento de directorio:
 * capabilities/<id>/canonical-baseline.json + su transcripción raw declarada.
 * Sin lista de capacidades: cualquier capacidad que la traiga se valida igual.
 */
export function loadCanonicalBaselines(
  root: string,
  masterVersion: string,
): {
  capabilityDir: string;
  baseline: unknown;
  rawText: string;
  rawBytes: Uint8Array;
  source: unknown | undefined;
}[] {
  const base = join(root, MASTER_DIR, masterVersion, "capabilities");
  return listCapabilitySourceIds(root, masterVersion)
    .filter((id) => existsSync(join(base, id, "canonical-baseline.json")))
    .map((id) => {
      const baseline = leerJson(join(base, id, "canonical-baseline.json")) as {
        rawSource?: { ref?: string };
      };
      const ref = baseline.rawSource?.ref ?? "";
      const rutaRaw = join(base, id, ref);
      const rawBytes = ref && existsSync(rutaRaw) ? readFileSync(rutaRaw) : new Uint8Array();
      const rutaFuente = join(base, id, "source.json");
      return {
        capabilityDir: id,
        baseline,
        rawText: new TextDecoder("utf-8").decode(rawBytes),
        rawBytes,
        source: existsSync(rutaFuente) ? leerJson(rutaFuente) : undefined,
      };
    });
}

/* ------------------------------------------------------------------ */
/* Knowledge Factory (M2-FACTORY-01)                                   */
/* ------------------------------------------------------------------ */

export const INTAKE_DIR = join("knowledge", "intake");
export const FACTORY_DIR = join("knowledge", "factory");
export const FACTORY_EVIDENCE_DIR = join(FACTORY_DIR, "evidence");
export const RUNTIME_EXTENSIONS_PATH = join(FACTORY_DIR, "runtime-extensions.json");
export const BATCH_MANIFEST_PATH = join(FACTORY_DIR, "batch-manifest.json");
export const BENCHMARK_PATH = join(FACTORY_DIR, "reports", "benchmark.md");

export function governanceEvidencePath(capabilityId: string): string {
  return join(FACTORY_EVIDENCE_DIR, `${capabilityId}.governance-evidence.json`);
}

function leerOpcional(ruta: string): unknown | undefined {
  return existsSync(ruta) ? leerJson(ruta) : undefined;
}

function bytesOpcionales(ruta: string): Uint8Array | null {
  return existsSync(ruta) ? new Uint8Array(readFileSync(ruta)) : null;
}

/**
 * Entradas de la Factory por descubrimiento de directorio:
 * - knowledge/master/<v>/capabilities/<id>/ (baseline canónica y/o source.json);
 * - knowledge/intake/<id>/registration.json (+ original, texto, candidato, aceptación).
 * Sin lista literal de capacidades.
 */
export function loadFactoryCapabilityInputs(root: string, masterVersion: string): FactoryCapabilityInput[] {
  const porId = new Map<string, FactoryCapabilityInput>();
  const pipelineInputs = new Map(
    discoverCapabilityPipelineInputs(root, masterVersion).map((p) => [
      ((p.source as { capability?: { id?: string } }).capability?.id ?? "") as string,
      p,
    ]),
  );
  const baselines = new Map(loadCanonicalBaselines(root, masterVersion).map((b) => [b.capabilityDir, b]));
  for (const id of listCapabilitySourceIds(root, masterVersion)) {
    const b = baselines.get(id);
    porId.set(id, {
      capabilityId: id,
      master: {
        pipelineInput: pipelineInputs.get(id) ?? null,
        ...(b ? { canonical: { baseline: b.baseline, rawText: b.rawText, rawBytes: b.rawBytes } } : {}),
      },
    });
  }
  for (const id of directorios(join(root, INTAKE_DIR)).sort()) {
    const dir = join(root, INTAKE_DIR, id);
    const registration = leerOpcional(join(dir, "registration.json")) as
      | { masterVersion?: string; original?: { ref?: string }; text?: { ref?: string } | null }
      | undefined;
    if (!registration) continue;
    if (registration.masterVersion && `v${registration.masterVersion}` !== masterVersion && registration.masterVersion !== masterVersion) continue;
    const candidate = leerOpcional(join(dir, "candidate.json"));
    const acceptance = leerOpcional(join(dir, "canonical-acceptance.json"));
    const intake = {
      registration,
      originalBytes: registration.original?.ref ? bytesOpcionales(join(dir, registration.original.ref)) : null,
      textBytes: registration.text?.ref ? bytesOpcionales(join(dir, registration.text.ref)) : null,
      ...(candidate !== undefined ? { candidate } : {}),
      ...(acceptance !== undefined ? { acceptance } : {}),
    };
    const prev = porId.get(id);
    porId.set(id, prev ? { ...prev, intake } : { capabilityId: id, intake });
  }
  for (const [id, entrada] of porId) {
    const ev = leerOpcional(join(root, governanceEvidencePath(id)));
    if (ev !== undefined) entrada.governanceEvidenceOnDisk = ev;
  }
  return [...porId.values()];
}

/** Código genérico que no puede ramificar por capacidad (engine, schema, pipeline, caso de uso). */
export const GENERIC_CODE_ROOTS = [
  join("packages", "knowledge-engine", "src"),
  join("packages", "knowledge-schema", "src"),
  join("packages", "knowledge-pipeline", "src"),
  join("packages", "contracts", "src"),
];
export const GENERIC_CODE_FILES = [
  join("src", "lib", "production", "caso-uso.ts"),
  join("src", "lib", "production", "puertos.ts"),
];

export function loadGenericCodeCorpus(root: string): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  for (const dir of GENERIC_CODE_ROOTS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs).sort()) {
      if (!f.endsWith(".ts") || f.endsWith(".test.ts")) continue;
      out.push({ path: join(dir, f), content: readFileSync(join(abs, f), "utf8") });
    }
  }
  for (const f of GENERIC_CODE_FILES) {
    if (existsSync(join(root, f))) out.push({ path: f, content: readFileSync(join(root, f), "utf8") });
  }
  return out;
}
