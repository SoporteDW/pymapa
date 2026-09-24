/**
 * M2-FACTORY-CLOSURE · A1 — Etapa genérica
 *
 *   ACCEPTED CANONICAL BASELINE → governed source representation (source.json)
 *   → runnable Knowledge Pack → validation → fixtures → Engine → publication gate
 *
 * Reglas (data-driven, sin ramas por capacidad):
 *  - Solo convenciones de identificador del Master (CE\d+, VA\d+, NI-…, P[1-5]-…).
 *  - Todo valor proyectado es literal de un campo de la baseline; nada se completa.
 *  - Si el Engine exige un campo que la baseline no declara, la proyección NO se
 *    emite: se devuelve un bloqueo clasificado (G · cost/review discipline).
 *  - Determinista: misma baseline + misma identidad ⇒ misma salida (checksum).
 * A2 · enriquecimiento de identidad: verificación literal de «<ID> · <nombre>»
 * y comparación de sustancia por hash; evento NON_SEMANTIC_METADATA_ENRICHMENT.
 */
import { computeChecksum } from "./checksum.ts";

export type BlockerClass =
  | "DETERMINISTIC_TECHNICAL_FIX"
  | "GENERIC_RUNTIME_EXTENSION_REQUIRED"
  | "GENUINE_HUMAN_SEMANTIC_DECISION";

export interface ProjectionBlocker {
  class: BlockerClass;
  code: string;
  objectKeys: string[];
  requirement: string;
  why: string;
  publicationBlocking: boolean;
}

interface BaselineObject {
  key: string;
  objectType: string;
  sourceId: string | null;
  fields: Record<string, unknown>;
  sourceLines: number[];
}
export interface ProjectableBaseline {
  capabilityId: string;
  baselineId: string;
  checksum: string;
  master: { identity: string; version: string; baselineStatus: string };
  objects: BaselineObject[];
}

const CRITICALITY = ["CRITICAL", "IMPORTANT", "COMPLEMENTARY", "CONTEXT_DEPENDENT"] as const;
const bodyOf = (o: BaselineObject) =>
  Array.isArray(o.fields["body"]) ? (o.fields["body"] as string[]) : [];
const byId = (objs: BaselineObject[], re: RegExp) =>
  objs.filter((o) => o.sourceId && re.test(o.sourceId));

export interface IdentityInput {
  name: string;
  /** Línea raw literal «<ID> · <name>» que verifica la identidad. */
  literalLine: number;
  definition: string | null;
}

export interface ProjectionResult {
  capabilityId: string;
  ok: boolean;
  source: Record<string, unknown> | null;
  blockers: ProjectionBlocker[];
  stats: { variables: number; informationNeeds: number; acquisitions: number; conditions: number };
  checksum: string | null;
}

export function projectBaselineToRunnableSource(
  baseline: ProjectableBaseline,
  identity: IdentityInput | null,
): ProjectionResult {
  const b: ProjectionBlocker[] = [];
  const objs = baseline.objects;
  if (!identity)
    b.push({
      class: "DETERMINISTIC_TECHNICAL_FIX",
      code: "CAPABILITY_NAME_MISSING",
      objectKeys: [],
      requirement: "capability.name literal",
      why: "el candidato no registró el nombre literal de la capacidad (A2)",
      publicationBlocking: true,
    });
  else if (!identity.definition)
    b.push({
      class: "DETERMINISTIC_TECHNICAL_FIX",
      code: "CAPABILITY_DEFINITION_NOT_IN_CANONICAL",
      objectKeys: [],
      requirement: "capability.definition literal",
      why: "la baseline no materializa un objeto con la definición literal de la capacidad; el extractor debe capturarla (no se redacta)",
      publicationBlocking: true,
    });

  const conditions = byId(objs, /^CE\d+$/).map((o) => ({
    id: o.sourceId,
    statement: String(o.fields["title"] ?? o.fields["heading"]),
  }));

  const variables: Record<string, unknown>[] = [];
  const informationNeeds: Record<string, unknown>[] = [];
  const noCrit: string[] = [];
  for (const o of byId(objs, /^VA\d+$/)) {
    const body = bodyOf(o);
    const crit = CRITICALITY.find((c) => body.some((l) => new RegExp(`\\b${c}\\b`).test(l)));
    if (!crit) noCrit.push(o.key);
    const ev = body.map((l) => /\bE[0-3]\b/.exec(l)?.[0]).find(Boolean);
    variables.push({
      id: o.sourceId,
      name: String(o.fields["title"] ?? o.fields["heading"]),
      criticality: crit ?? null,
      minimumEvidence: ev ?? "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER",
      semanticStates: null,
    });
    // NI literalmente contenidas en la sección de la VA (estructura, no inferencia).
    for (const l of body) {
      const m = /^(NI-[0-9A-Za-z.]+)\s+(\S.*)$/.exec(l.trim());
      if (m)
        informationNeeds.push({
          id: m[1],
          statement: m[2],
          variableRefs: [o.sourceId],
          acquisitionRefs: [],
          mappingStatus: "STRUCTURAL_CONTAINMENT",
        });
    }
  }
  if (variables.length === 0)
    b.push({
      class: "DETERMINISTIC_TECHNICAL_FIX",
      code: "NO_VARIABLES_IN_CANONICAL",
      objectKeys: [],
      requirement: "≥1 VA",
      why: "ninguna VA materializada en la baseline",
      publicationBlocking: true,
    });
  if (noCrit.length)
    b.push({
      class: "GENERIC_RUNTIME_EXTENSION_REQUIRED",
      code: "GRE-CRITICALITY-NOT-EXPLICIT",
      objectKeys: noCrit,
      requirement:
        "variables[].criticality ∈ {CRITICAL, IMPORTANT, COMPLEMENTARY, CONTEXT_DEPENDENT}",
      why: "Engine 0.2.0 exige criticidad enumerada por VA; la fuente no la declara para estas VA y asignarla sería inferencia. Requiere que el contrato/engine admita NOT_EXPLICIT_IN_KNOWLEDGE_MASTER en criticality con semántica gobernada (hoy solo lo admite minimumEvidence).",
      publicationBlocking: true,
    });

  const vaIds = new Set(variables.map((v) => v.id as string));
  const acquisitions: Record<string, unknown>[] = [];
  const unmapped: string[] = [];
  for (const o of byId(objs, /^P[1-5]-/)) {
    const body = bodyOf(o);
    const question = body.find((l) => /¿[^?]+\?/.test(l));
    const refs = [
      ...new Set(body.flatMap((l) => l.match(/\bVA\d+\b/g) ?? []).filter((r) => vaIds.has(r))),
    ];
    if (!question || refs.length === 0) {
      unmapped.push(o.key);
      continue;
    }
    acquisitions.push({
      id: o.sourceId,
      level: (o.sourceId as string).slice(0, 2),
      variableRefs: refs,
      question: question.trim(),
      responseModel: {
        kind: "free_statement_or_unknown",
        preservesUnknown: true,
        knowledgeStates: ["KNOWN", "UNKNOWN", "NOT_APPLICABLE", "CONTRADICTORY"],
        optionSet: null,
        optionSetStatus: "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER",
      },
    });
  }
  if (acquisitions.length === 0)
    b.push({
      class: "DETERMINISTIC_TECHNICAL_FIX",
      code: "NO_RUNNABLE_ACQUISITION_IN_CANONICAL",
      objectKeys: unmapped,
      requirement: "≥1 adquisición P1–P5 con pregunta literal «¿…?» y VA literalmente referidas",
      why: "la baseline no materializa preguntas con referencia literal a VA; no se asocian por proximidad ni por rango",
      publicationBlocking: true,
    });

  const stats = {
    variables: variables.length,
    informationNeeds: informationNeeds.length,
    acquisitions: acquisitions.length,
    conditions: conditions.length,
  };
  if (b.length)
    return { capabilityId: baseline.capabilityId, ok: false, source: null, blockers: b, stats, checksum: null };

  const body = {
    master: baseline.master,
    capability: {
      id: baseline.capabilityId,
      domainId: baseline.capabilityId.slice(0, 2),
      name: identity!.name,
      definition: identity!.definition!,
    },
    provenance: {
      sourceReference: `canonical-baseline.json#${baseline.baselineId}@${baseline.checksum}`,
      extractionStatus: "APPROVED",
      derivation: "MASTER_TRANSCRIPTION",
      derivationNote: "Proyección genérica determinista desde baseline canónica aceptada.",
      approvedBy: "PROJECT_OWNER / KNOWLEDGE_GOVERNANCE_AUTHORITY",
      approvedAt: "2026-09-24",
    },
    targetPack: { packId: baseline.capabilityId.toLowerCase(), packVersion: "1.0.0" },
    sections: {
      capability: { id: baseline.capabilityId, name: identity!.name, definition: identity!.definition },
      conditionsOfExistence: conditions,
      variables,
      informationNeeds,
      acquisitions,
    },
    gaps: [],
  };
  const checksum = computeChecksum(body);
  return {
    capabilityId: baseline.capabilityId,
    ok: true,
    source: { ...body, checksum },
    blockers: [],
    stats,
    checksum,
  };
}

/* ------------------------- A2 · identidad ------------------------- */

export interface IdentityEnrichmentEvent {
  kind: "NON_SEMANTIC_METADATA_ENRICHMENT";
  capabilityId: string;
  field: "capability.name";
  value: string;
  literal: string;
  sourceLines: [number, number];
  substanceHashBefore: string;
  substanceHashAfter: string;
  substanceUnchanged: boolean;
  humanAcceptancePreserved: boolean;
}

/** Hash de sustancia: ítems del candidato/baseline, sin metadatos de identidad. */
export function substanceHash(items: unknown[]): string {
  return computeChecksum({ items });
}

export function enrichCapabilityIdentity(input: {
  capabilityId: string;
  name: string;
  rawText: string;
  itemsBefore: unknown[];
  itemsAfter: unknown[];
}): { ok: true; event: IdentityEnrichmentEvent } | { ok: false; reason: string } {
  const literal = `${input.capabilityId} · ${input.name}`;
  const line =
    input.rawText
      .split("\n")
      .findIndex((l) => l.replace(/^#{1,9}\s+/, "").trim() === literal) + 1;
  if (line === 0) return { ok: false, reason: `identidad «${literal}» no aparece literal en la fuente` };
  const before = substanceHash(input.itemsBefore);
  const after = substanceHash(input.itemsAfter);
  const same = before === after;
  return {
    ok: true,
    event: {
      kind: "NON_SEMANTIC_METADATA_ENRICHMENT",
      capabilityId: input.capabilityId,
      field: "capability.name",
      value: input.name,
      literal,
      sourceLines: [line, line],
      substanceHashBefore: before,
      substanceHashAfter: after,
      substanceUnchanged: same,
      humanAcceptancePreserved: same,
    },
  };
}
