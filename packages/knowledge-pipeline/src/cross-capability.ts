/**
 * Registro gobernado de integridad entre capacidades (M2-BATCH-01R).
 *
 * Aquí viven las decisiones humanas que afectan a más de una capacidad
 * (backlog heredado, fronteras). Un pack publicado es inmutable: la
 * resolución de su backlog se registra aquí, nunca editando el pack.
 *
 * El validador es genérico: verifica la literalidad de cada evidencia contra
 * la fuente registrada, que el pack publicado citado no haya cambiado y el
 * estado efectivo de cada condición. Nunca cierra una entrada por sí mismo.
 */
import { z } from "zod";
import { computeSelfChecksum, verifySelfChecksum } from "./checksum.ts";
import type { ExtractionCandidate } from "./candidate.ts";

export const CROSS_CAPABILITY_REGISTRY_PATH = "knowledge/factory/cross-capability-registry.json";

const capId = z.string().regex(/^[A-Z]{2}-\d{2}$/);
const lineRange = z.tuple([z.number().int().positive(), z.number().int().positive()]);

export const crossCapabilityEntrySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["GOVERNED_BACKLOG_RESOLUTION", "CANONICAL_BOUNDARY"]),
  capabilities: z.array(capId).min(2),
  decision: z.enum([
    "KEEP_OPEN_PENDING_OP03_CANONICAL_ACCEPTANCE",
    "KEEP_OPEN",
    "REQUIRES_HUMAN_REVIEW",
    "CLOSE",
    "ACCEPTED_CONDITIONAL",
    "ACCEPTED",
  ]),
  decidedBy: z.string().min(1),
  decidedAt: z.string().min(1),
  authorizationSource: z.string().min(1),
  statement: z.string().min(1),
  evidence: z
    .array(
      z.object({
        capabilityId: capId,
        textSha256: z.string().regex(/^[0-9a-f]{64}$/),
        sourceLines: lineRange,
        text: z.string().min(1),
      }),
    )
    .min(1),
  resolutionCondition: z
    .object({
      type: z.enum(["CANONICAL_ACCEPTANCE", "NO_LATER_SOURCE_CONTRADICTION"]),
      capabilityId: capId,
      sourceId: z.string().min(1).optional(),
    })
    .nullable(),
  resolutionEvent: z
    .object({
      recordedAt: z.string().min(1),
      canonicalAcceptanceChecksum: z.string().regex(/^sha256:[0-9a-f]{64}$/),
      evidenceRefs: z.array(z.number().int().nonnegative()).min(1),
    })
    .nullable(),
  publishedPackUnchanged: z
    .object({ packId: z.string().min(1), packVersion: z.string().min(1), checksum: z.string() })
    .optional(),
});
export type CrossCapabilityEntry = z.infer<typeof crossCapabilityEntrySchema>;

export const crossCapabilityRegistrySchema = z.object({
  $schema: z.string().optional(),
  registryId: z.string().min(1),
  statement: z.string().min(1),
  entries: z.array(crossCapabilityEntrySchema),
  checksum: z.string().regex(/^sha256:[0-9a-f]{64}$/),
});

export type CrossCapabilityStatus =
  | "OPEN_PENDING_CANONICAL_ACCEPTANCE"
  | "RESOLUTION_EVENT_ELIGIBLE"
  | "RESOLVED"
  | "CONDITION_MET"
  | "CONDITION_NOT_MET"
  | "OPEN";

export interface CrossCapabilityEntryResult {
  id: string;
  decision: CrossCapabilityEntry["decision"];
  effectiveStatus: CrossCapabilityStatus;
  detail: string;
}

export interface CrossCapabilityValidation {
  ok: boolean;
  issues: { severity: "FAIL" | "REVIEW"; entryId: string | null; message: string }[];
  entries: CrossCapabilityEntryResult[];
}

export function validateCrossCapabilityRegistry(input: {
  registry: unknown;
  /** Texto raw vigente por capacidad (intake o master). */
  sources: Map<string, { textSha256: string; rawText: string }>;
  candidates: Map<string, ExtractionCandidate>;
  acceptances: Map<string, { decision: string; candidateChecksum: string } | undefined>;
  publishedPacks: Map<string, string>;
}): CrossCapabilityValidation {
  const issues: CrossCapabilityValidation["issues"] = [];
  const parsed = crossCapabilityRegistrySchema.safeParse(input.registry);
  if (!parsed.success)
    return {
      ok: false,
      entries: [],
      issues: parsed.error.issues.map((i) => ({
        severity: "FAIL" as const,
        entryId: null,
        message: `${i.path.join(".")}: ${i.message}`,
      })),
    };
  const self = verifySelfChecksum(input.registry as Record<string, unknown>);
  if (!self.ok)
    issues.push({
      severity: "FAIL",
      entryId: null,
      message: `checksum del registro inválido (esperado ${self.expected})`,
    });
  const entries: CrossCapabilityEntryResult[] = [];
  const ids = new Set<string>();
  for (const e of parsed.data.entries) {
    const fail = (message: string) => issues.push({ severity: "FAIL", entryId: e.id, message });
    if (ids.has(e.id)) fail("identificador duplicado");
    ids.add(e.id);
    e.evidence.forEach((ev, n) => {
      const src = input.sources.get(ev.capabilityId);
      if (!src) return fail(`evidencia ${n}: sin fuente registrada de ${ev.capabilityId}`);
      if (src.textSha256 !== ev.textSha256)
        return fail(`evidencia ${n}: la fuente de ${ev.capabilityId} no es la citada (sha256)`);
      const [a, b] = ev.sourceLines;
      const tramo = src.rawText.split("\n").slice(a - 1, b).join("\n");
      if (a > b || !tramo.includes(ev.text))
        fail(`evidencia ${n}: "${ev.text.slice(0, 60)}" no es literal en ${a}–${b}`);
    });
    if (e.publishedPackUnchanged) {
      const k = `${e.publishedPackUnchanged.packId}@${e.publishedPackUnchanged.packVersion}`;
      if (input.publishedPacks.get(k) !== e.publishedPackUnchanged.checksum)
        fail(`el pack publicado ${k} cambió o no existe: un pack publicado es inmutable`);
    }
    let effectiveStatus: CrossCapabilityStatus = "OPEN";
    let detail = "sin condición de resolución";
    const cond = e.resolutionCondition;
    if (cond?.type === "CANONICAL_ACCEPTANCE") {
      const cand = input.candidates.get(cond.capabilityId);
      const acc = input.acceptances.get(cond.capabilityId);
      const vigente =
        !!cand && !!acc && acc.decision === "ACCEPTED" && acc.candidateChecksum === cand.checksum;
      if (e.resolutionEvent) {
        if (!vigente || e.resolutionEvent.canonicalAcceptanceChecksum !== cand?.checksum)
          fail("evento de resolución registrado sin aceptación canónica vigente");
        effectiveStatus = "RESOLVED";
        detail = `resuelto por la aceptación canónica de ${cond.capabilityId}`;
      } else if (vigente) {
        effectiveStatus = "RESOLUTION_EVENT_ELIGIBLE";
        detail = `${cond.capabilityId} aceptada: registrar el evento de resolución citando la evidencia`;
      } else {
        effectiveStatus = "OPEN_PENDING_CANONICAL_ACCEPTANCE";
        detail = `${cond.capabilityId} sin aceptación canónica vigente; la entrada permanece abierta`;
      }
    } else if (cond?.type === "NO_LATER_SOURCE_CONTRADICTION") {
      const cand = input.candidates.get(cond.capabilityId);
      const src = input.sources.get(cond.capabilityId);
      const sid = cond.sourceId ?? e.id;
      const occ = cand?.items.filter((i) => i.sourceId === sid) ?? [];
      const defLine = Math.max(...e.evidence.map((x) => x.sourceLines[1]));
      const later = (src?.rawText.split("\n") ?? []).flatMap((l, i) =>
        i + 1 > defLine && l.includes(sid) ? [i + 1] : [],
      );
      const single = occ.length === 1 && occ[0]?.classification === "FINAL_APPROVED";
      const sinSupersesion = occ.every((i) => !i.supersession && i.classification !== "SUPERSEDED");
      if (single && sinSupersesion && later.length === 0) {
        effectiveStatus = "CONDITION_MET";
        detail = `definición única FINAL_APPROVED en ${cond.capabilityId}; sin apariciones posteriores ni evidencia de supersesión`;
      } else {
        effectiveStatus = "CONDITION_NOT_MET";
        detail = `revisión humana: ${occ.length} definición(es), apariciones posteriores ${later.join(", ") || "ninguna"}`;
        issues.push({ severity: "REVIEW", entryId: e.id, message: detail });
      }
    }
    entries.push({ id: e.id, decision: e.decision, effectiveStatus, detail });
  }
  return { ok: !issues.some((i) => i.severity === "FAIL"), issues, entries };
}

export function sealCrossCapabilityRegistry(
  body: Omit<z.infer<typeof crossCapabilityRegistrySchema>, "checksum">,
) {
  return { ...body, checksum: computeSelfChecksum(body as unknown as Record<string, unknown>) };
}
