/**
 * Carga desde el repositorio (node:fs). El pipeline se ejecuta con el repo y
 * nada más: sin prompts, sin estado externo, sin configuración oculta.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { computeSelfChecksum } from "./checksum.ts";
import type { CapabilityPipelineInput } from "./pipeline.ts";
import type { GovernanceReview, PublishedPackRecord } from "./publication.ts";

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
  return listCapabilitySourceIds(root, masterVersion).map((capabilityId) => {
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
