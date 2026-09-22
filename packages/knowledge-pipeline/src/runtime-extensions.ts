/**
 * Registro genérico de extensiones de runtime (M2-FACTORY-01 · B5).
 *
 * Cuando una capacidad expone un constructo de razonamiento legítimo que el
 * runtime genérico no soporta, la fuente registra un gap
 * GENERIC_RUNTIME_EXTENSION_REQUIRED. Este registro vincula cada ocurrencia a
 * una CAPACIDAD SEMÁNTICA genérica (no a la capacidad de negocio), con su
 * evidencia de fuente, los tipos de objeto afectados y si bloquea publicación.
 *
 * Una extensión se cierra únicamente por un cambio genérico del engine
 * registrado en ENGINE_SEMANTIC_HISTORY. Nunca por branching de capacidad.
 */
import { z } from "zod";
import { verifySelfChecksum } from "./checksum.ts";

export const runtimeExtensionRegistrySchema = z.object({
  $schema: z.string().optional(),
  registryId: z.string().min(1),
  statement: z.string().min(1),
  entries: z.array(
    z.object({
      extensionId: z.string().regex(/^GRX-\d{3}$/),
      semanticCapability: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
      statement: z.string().min(1),
      status: z.enum(["OPEN", "CLOSED"]),
      closedInEngineVersion: z.string().regex(/^\d+\.\d+\.\d+$/).nullable(),
      engineChangeRefs: z.array(z.string().min(1)),
      publicationBlockingWhileOpen: z.boolean(),
      occurrences: z.array(
        z.object({
          capabilityId: z.string().regex(/^[A-Z]{2}-\d{2}$/),
          gapId: z.string().min(1),
          affectedObjectTypes: z.array(z.string().min(1)),
          sourceEvidence: z.string().min(1),
        }),
      ),
    }),
  ),
  checksum: z.string().regex(/^sha256:[0-9a-f]{64}$/),
});
export type RuntimeExtensionRegistry = z.infer<typeof runtimeExtensionRegistrySchema>;

/** Índice por ocurrencia `<capabilityId>/<gapId>` (búsqueda por identidad, no branching). */
export function indexExtensionOccurrences(
  registry: RuntimeExtensionRegistry | null,
): Map<string, RuntimeExtensionRegistry["entries"][number]> {
  const m = new Map<string, RuntimeExtensionRegistry["entries"][number]>();
  for (const e of registry?.entries ?? []) for (const o of e.occurrences) m.set(`${o.capabilityId}/${o.gapId}`, e);
  return m;
}

export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export interface RuntimeExtensionIssue {
  code:
    | "SCHEMA"
    | "CHECKSUM"
    | "DUPLICATE_EXTENSION"
    | "DUPLICATE_OCCURRENCE"
    | "CLOSURE_WITHOUT_ENGINE_VERSION"
    | "CLOSURE_IN_FUTURE_ENGINE"
    | "UNKNOWN_ENGINE_CHANGE"
    | "OPEN_WITH_CLOSURE";
  message: string;
}

export function validateRuntimeExtensionRegistry(input: {
  registry: unknown;
  engineSemver: string;
  engineChangeIds: readonly string[];
}): { ok: boolean; registry: RuntimeExtensionRegistry | null; issues: RuntimeExtensionIssue[] } {
  const parsed = runtimeExtensionRegistrySchema.safeParse(input.registry);
  if (!parsed.success) {
    return {
      ok: false,
      registry: null,
      issues: parsed.error.issues.map((i) => ({ code: "SCHEMA" as const, message: `${i.path.join(".")}: ${i.message}` })),
    };
  }
  const reg = parsed.data;
  const issues: RuntimeExtensionIssue[] = [];
  const c = verifySelfChecksum(input.registry as Record<string, unknown>);
  if (!c.ok) issues.push({ code: "CHECKSUM", message: `checksum inválido (esperado ${c.expected})` });
  const ids = new Set<string>();
  const occ = new Set<string>();
  const cambios = new Set(input.engineChangeIds);
  for (const e of reg.entries) {
    if (ids.has(e.extensionId)) issues.push({ code: "DUPLICATE_EXTENSION", message: e.extensionId });
    ids.add(e.extensionId);
    for (const o of e.occurrences) {
      const k = `${o.capabilityId}/${o.gapId}`;
      if (occ.has(k)) issues.push({ code: "DUPLICATE_OCCURRENCE", message: `${k} registrado en más de una extensión` });
      occ.add(k);
    }
    if (e.status === "CLOSED") {
      if (!e.closedInEngineVersion || e.engineChangeRefs.length === 0)
        issues.push({ code: "CLOSURE_WITHOUT_ENGINE_VERSION", message: `${e.extensionId}: CLOSED exige closedInEngineVersion y engineChangeRefs` });
      else if (compareSemver(e.closedInEngineVersion, input.engineSemver) > 0)
        issues.push({ code: "CLOSURE_IN_FUTURE_ENGINE", message: `${e.extensionId}: cerrada en ${e.closedInEngineVersion} > engine ${input.engineSemver}` });
      e.engineChangeRefs
        .filter((r) => !cambios.has(r))
        .forEach((r) => issues.push({ code: "UNKNOWN_ENGINE_CHANGE", message: `${e.extensionId}: ${r} no existe en ENGINE_SEMANTIC_HISTORY` }));
    } else if (e.closedInEngineVersion !== null) {
      issues.push({ code: "OPEN_WITH_CLOSURE", message: `${e.extensionId}: OPEN no puede declarar closedInEngineVersion` });
    }
  }
  return { ok: issues.length === 0, registry: reg, issues };
}

export interface CapabilityExtensionOccurrence {
  gapId: string;
  extensionId: string | null;
  semanticCapability: string | null;
  status: "CLOSED" | "OPEN" | "UNREGISTERED";
  closedInEngineVersion: string | null;
  blocksPublication: boolean;
  /** Estado de cierre declarado por la fuente ejecutable para este gap. */
  sourceResolution: "CLOSED_BY_GENERIC_RUNTIME_EXTENSION" | null;
}

export interface CapabilityExtensionResolution {
  occurrences: CapabilityExtensionOccurrence[];
  /** Ocurrencias del registro que la capacidad ya no declara. */
  danglingGapIds: string[];
  /** Mínima versión del engine que cubre todas las extensiones cerradas. */
  requiredEngineVersion: string;
  inconsistencies: string[];
}

export function resolveCapabilityExtensions(input: {
  capabilityId: string;
  gaps: { id: string; kind: string; publicationBlocking: boolean; resolution?: { status: string } | undefined }[];
  registry: RuntimeExtensionRegistry | null;
  baselineEngineVersion: string;
}): CapabilityExtensionResolution {
  const byOccurrence = new Map<string, RuntimeExtensionRegistry["entries"][number]>();
  const prefijo = `${input.capabilityId}/`;
  for (const e of input.registry?.entries ?? [])
    for (const o of e.occurrences) {
      const clave = `${o.capabilityId}/${o.gapId}`;
      if (clave.startsWith(prefijo)) byOccurrence.set(o.gapId, e);
    }
  const occurrences: CapabilityExtensionOccurrence[] = [];
  const inconsistencies: string[] = [];
  let required = input.baselineEngineVersion;
  for (const g of input.gaps.filter((x) => x.kind === "GENERIC_RUNTIME_EXTENSION_REQUIRED")) {
    const e = byOccurrence.get(g.id) ?? null;
    const sourceResolution = g.resolution?.status === "CLOSED_BY_GENERIC_RUNTIME_EXTENSION" ? "CLOSED_BY_GENERIC_RUNTIME_EXTENSION" : null;
    if (e?.status === "CLOSED" && e.closedInEngineVersion && compareSemver(e.closedInEngineVersion, required) > 0)
      required = e.closedInEngineVersion;
    if (e && e.status === "OPEN" && sourceResolution)
      inconsistencies.push(`${g.id}: la fuente lo declara cerrado pero ${e.extensionId} sigue OPEN`);
    if (e && e.status === "CLOSED" && !sourceResolution)
      inconsistencies.push(`${g.id}: ${e.extensionId} está CLOSED pero la fuente ejecutable no declara resolution; anotar resolution en source.json`);
    occurrences.push({
      gapId: g.id,
      extensionId: e?.extensionId ?? null,
      semanticCapability: e?.semanticCapability ?? null,
      status: e ? e.status : "UNREGISTERED",
      closedInEngineVersion: e?.closedInEngineVersion ?? null,
      blocksPublication: e ? e.status === "OPEN" && (e.publicationBlockingWhileOpen || g.publicationBlocking) : g.publicationBlocking,
      sourceResolution,
    });
  }
  const declared = new Set(occurrences.map((o) => o.gapId));
  const danglingGapIds = [...byOccurrence.keys()].filter((k) => !declared.has(k)).sort();
  return { occurrences, danglingGapIds, requiredEngineVersion: required, inconsistencies };
}
