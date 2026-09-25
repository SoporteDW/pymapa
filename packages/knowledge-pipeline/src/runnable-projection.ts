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
import {
  extractCapabilityDefinition,
  linkInformationNeeds,
  applyGovernedOrdinalMapping,
  extractProgressiveAcquisition,
  type GovernedOrdinalMappingDecision,
  type OrdinalMappingCheck,
  NOT_EXPLICIT_MARK,
  type CapabilityDefinitionResult,
} from "./source-structure.ts";

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
  historicalStatus?: { marker?: string };
  objects: BaselineObject[];
}

const CRITICALITY = ["CRITICAL", "IMPORTANT", "COMPLEMENTARY", "CONTEXT_DEPENDENT"] as const;
const bodyOf = (o: BaselineObject) =>
  Array.isArray(o.fields["body"]) ? (o.fields["body"] as string[]) : [];
const byId = (objs: BaselineObject[], re: RegExp) =>
  objs.filter((o) => o.sourceId && re.test(o.sourceId));

/* ------------- M2-FACTORY-CONTRACT-03 · contrato de campos ------------- */

export type FieldRequirement =
  | "REQUIRED_FOR_RUNTIME"
  | "OPTIONAL_SOURCE_METADATA"
  | "NOT_EXPLICIT_ALLOWED"
  | "CONTEXTUAL"
  | "DERIVED_FROM_EXPLICIT_STRUCTURE";

/**
 * Clasificación genérica de cada campo del contrato baseline → pack ejecutable.
 * La generación solo falla por un campo REQUIRED_FOR_RUNTIME ausente.
 */
export const PACK_FIELD_CONTRACT: Readonly<Record<string, FieldRequirement>> = {
  "capability.id": "REQUIRED_FOR_RUNTIME",
  "capability.name": "REQUIRED_FOR_RUNTIME",
  "capability.definition": "NOT_EXPLICIT_ALLOWED",
  conditionsOfExistence: "OPTIONAL_SOURCE_METADATA",
  variables: "REQUIRED_FOR_RUNTIME",
  "variables[].criticality": "NOT_EXPLICIT_ALLOWED",
  "variables[].minimumEvidence": "NOT_EXPLICIT_ALLOWED",
  "variables[].minimumEvidenceResolution": "NOT_EXPLICIT_ALLOWED",
  "variables[].semanticStates": "OPTIONAL_SOURCE_METADATA",
  "variables[].acquisitionResolution": "REQUIRED_FOR_RUNTIME",
  informationNeeds: "NOT_EXPLICIT_ALLOWED",
  "informationNeeds[].variableRefs": "DERIVED_FROM_EXPLICIT_STRUCTURE",
  acquisitions: "NOT_EXPLICIT_ALLOWED",
  "acquisitions[].id(INFORMATION_NEED)": "DERIVED_FROM_EXPLICIT_STRUCTURE",
  "acquisitions[].level": "OPTIONAL_SOURCE_METADATA",
  "acquisitions[].question": "OPTIONAL_SOURCE_METADATA",
  "acquisitionStages[].variableRefs": "CONTEXTUAL",
};

export interface IdentityInput {
  name: string;
  /** Línea raw literal «<ID> · <name>» que verifica la identidad. */
  literalLine: number;
  /** Obsoleto (M2-FACTORY-CLOSURE): la definición se extrae de la fuente. */
  definition?: string | null;
}

export interface ProjectionResult {
  capabilityId: string;
  ok: boolean;
  source: Record<string, unknown> | null;
  blockers: ProjectionBlocker[];
  stats: {
    variables: number;
    informationNeeds: number;
    linkedInformationNeeds: number;
    acquisitions: number;
    questionAcquisitions: number;
    acquisitionStages: number;
    conditions: number;
    variablesWithAcquisitionPath: number;
    variablesUnresolved: number;
    criticalityNotExplicit: number;
  };
  definition: CapabilityDefinitionResult | null;
  ordinalMapping?: OrdinalMappingCheck | null;
  checksum: string | null;
}

const RESPONSE_MODEL = {
  kind: "free_statement_or_unknown",
  preservesUnknown: true,
  knowledgeStates: ["KNOWN", "UNKNOWN", "NOT_APPLICABLE", "CONTRADICTORY"],
  optionSet: null,
  optionSetStatus: NOT_EXPLICIT_MARK,
};

export function projectBaselineToRunnableSource(
  baseline: ProjectableBaseline,
  identity: IdentityInput | null,
  rawText = "",
  options: { governedOrdinalMapping?: GovernedOrdinalMappingDecision } = {},
): ProjectionResult {
  const b: ProjectionBlocker[] = [];
  const gaps: Record<string, unknown>[] = [];
  const cap = baseline.capabilityId;
  const objs = baseline.objects;
  if (!identity)
    b.push({
      class: "DETERMINISTIC_TECHNICAL_FIX",
      code: "CAPABILITY_NAME_MISSING",
      objectKeys: [],
      requirement: "capability.name literal (REQUIRED_FOR_RUNTIME)",
      why: "el candidato no registró el nombre literal de la capacidad",
      publicationBlocking: true,
    });

  const definition = extractCapabilityDefinition(cap, rawText);
  if (definition.status === "NOT_EXPLICIT")
    gaps.push({
      id: `NE-${cap}-DEFINITION`,
      kind: "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER",
      statement: `Definición final de la capacidad no explícita en la fuente (${definition.why}). Se preserva el silencio; no se redacta.`,
      publicationBlocking: false,
    });
  if (definition.status === "REVIEW_REQUIRED")
    gaps.push({
      id: `REV-${cap}-DEFINITION`,
      kind: "GOVERNED_JUDGMENT",
      statement: `Varias definiciones productivas distintas sin supersesión explícita (${definition.candidates.map((c) => `L${c.sourceLines[0]}`).join(", ")}).`,
      publicationBlocking: true,
    });

  const conditions = byId(objs, /^CE\d+$/).map((o) => ({
    id: o.sourceId,
    statement: String(o.fields["title"] ?? o.fields["heading"]),
  }));

  const vaObjs = byId(objs, /^VA\d+$/);
  const vaIds = vaObjs.map((o) => o.sourceId as string);
  const vaSet = new Set(vaIds);
  if (vaObjs.length === 0)
    b.push({
      class: "DETERMINISTIC_TECHNICAL_FIX",
      code: "NO_VARIABLES_IN_CANONICAL",
      objectKeys: [],
      requirement: "≥1 VA (REQUIRED_FOR_RUNTIME)",
      why: "ninguna VA materializada en la baseline",
      publicationBlocking: true,
    });

  // Adquisiciones con pregunta literal y VA literalmente referidas (modo QUESTION).
  const acquisitions: Record<string, unknown>[] = [];
  const stages: Record<string, unknown>[] = [];
  for (const o of byId(objs, /^P[1-5](-|$)/)) {
    const body = bodyOf(o);
    const prompts = body.filter((l) => /¿[^?]+\?/.test(l)).map((l) => l.trim());
    const refs = [
      ...new Set(body.flatMap((l) => l.match(/\bVA\d+\b/g) ?? []).filter((r) => vaSet.has(r))),
    ];
    const level = (o.sourceId as string).slice(0, 2);
    if (prompts.length && refs.length) {
      acquisitions.push({
        id: o.sourceId,
        level,
        acquisitionMode: "QUESTION",
        variableRefs: refs,
        question: prompts[0],
        responseModel: RESPONSE_MODEL,
      });
      continue;
    }
    stages.push({
      id: o.sourceId,
      level,
      heading: String(o.fields["heading"] ?? o.sourceId),
      prompts,
      variableRefsResolution: "CONTEXTUAL",
      sourceLines: o.sourceLines,
    });
  }

  // NI y vínculo NI→VA por estructura explícita; canal de adquisición por NI.
  let needs = linkInformationNeeds(rawText, vaIds);
  let ordinalCheck: OrdinalMappingCheck | null = null;
  if (options.governedOrdinalMapping) {
    const r = applyGovernedOrdinalMapping(needs, vaIds, rawText, options.governedOrdinalMapping);
    needs = r.needs;
    ordinalCheck = r.check;
  }
  const conflicting = needs.filter((n) => n.mappingStatus.startsWith("REVIEW"));
  if (conflicting.length)
    gaps.push({
      id: `REV-${cap}-NI-OCCURRENCES`,
      kind: "GOVERNED_JUDGMENT",
      statement: `NI con ocurrencias en conflicto (vínculo o texto distinto): ${conflicting.map((n) => n.id).join(", ")}.`,
      publicationBlocking: true,
    });
  const informationNeeds = needs.map((n) => {
    const linked = n.variableRefs.length > 0;
    const acqId = `ACQ·${n.id}`;
    if (linked)
      acquisitions.push({
        id: acqId,
        acquisitionMode: "INFORMATION_NEED",
        informationNeedRef: n.id,
        variableRefs: n.variableRefs,
        questionStatus: NOT_EXPLICIT_MARK,
        responseModel: RESPONSE_MODEL,
      });
    return {
      id: n.id,
      idStatus: n.idStatus,
      statement: n.statement,
      variableRefs: n.variableRefs,
      acquisitionRefs: linked ? [acqId] : [],
      mappingStatus: n.mappingStatus,
      mappingEvidence: n.mappingEvidence,
      sourceLines: n.sourceLines,
    };
  });

  /*
   * M2-FINAL-15 · solo si quedan VA sin vía tras los canales explícitos:
   *  B) GOVERNED_STRUCTURAL_CORRESPONDENCE — la fuente declara «Resultan N NI
   *     correspondientes» con N = |VA| y no enumera NI: un canal por VA, sin
   *     texto NI ni IDs NI01..NInn fabricados.
   *  C) CAPABILITY_PROGRESSIVE — preguntas P1 literales (con núcleo, P2, P3 y
   *     provenance) como canales de capacidad sobre las VA restantes.
   * Sin ninguna de las dos: ACQUISITION_SEMANTICS_MISSING (bloqueante).
   */
  const fedBefore = new Set(acquisitions.flatMap((a) => a["variableRefs"] as string[]));
  const pending = vaIds.filter((v) => !fedBefore.has(v));
  const progressive = pending.length ? extractProgressiveAcquisition(rawText) : null;
  const correspondence = new Set<string>();
  const decl = progressive?.niDeclaration ?? null;
  const enumeratedLinked = informationNeeds.filter((n) => n.variableRefs.length).length;
  if (decl && pending.length && enumeratedLinked < decl.count) {
    gaps.push({
      id: `NI-NOT-ENUMERATED-${cap}`,
      kind: "INFORMATION_NEED_NOT_ENUMERATED",
      statement: `La fuente declara ${decl.count} NI sin enumerarlas individualmente (DECLARED_NOT_ENUMERATED): «${decl.text}» (L${decl.line}). No se redacta texto NI ni se fabrican IDs.`,
      publicationBlocking: false,
      sourceReference: `raw L${decl.line}`,
    });
    if (decl.correspondence && decl.count === vaIds.length && enumeratedLinked === 0)
      for (const va of pending) {
        correspondence.add(va);
        acquisitions.push({
          id: `ACQ·NI-CORRESPONDENCE·${va}`,
          acquisitionMode: "GOVERNED_STRUCTURAL_CORRESPONDENCE",
          variableRefs: [va],
          informationNeedStatus: "DECLARED_NOT_ENUMERATED",
          correspondenceStatement: decl.text,
          correspondenceSourceLines: [decl.line, decl.line],
          questionStatus: NOT_EXPLICIT_MARK,
          responseModel: RESPONSE_MODEL,
        });
      }
  }
  const progressiveVa = pending.filter((v) => !correspondence.has(v));
  const progressiveSet = new Set<string>();
  if (progressive?.p1?.questions.length && progressiveVa.length) {
    progressiveVa.forEach((v) => progressiveSet.add(v));
    progressive.p1.questions.forEach((q, i) =>
      acquisitions.push({
        id: `ACQ·P1·${String(i + 1).padStart(2, "0")}`,
        level: "P1",
        acquisitionMode: "CAPABILITY_PROGRESSIVE",
        variableRefs: progressiveVa,
        question: q.text,
        questionSourceLines: [q.line, q.line],
        progressiveContext: {
          informationNeedStatus: decl ? "DECLARED_NOT_ENUMERATED" : NOT_EXPLICIT_MARK,
          declaredInformationNeeds: decl
            ? { count: decl.count, statement: decl.text, line: decl.line }
            : null,
          nuclear: progressive.nuclear,
          p1Heading: progressive.p1!.heading,
          p2: progressive.p2,
          p3: progressive.p3,
        },
        responseModel: RESPONSE_MODEL,
      }),
    );
  }

  const fed = new Set(acquisitions.flatMap((a) => a["variableRefs"] as string[]));
  const variables: Record<string, unknown>[] = [];
  const noCrit: string[] = [];
  const unresolved: string[] = [];
  for (const o of vaObjs) {
    const body = bodyOf(o);
    const crit = CRITICALITY.find((c) => body.some((l) => new RegExp(`\\b${c}\\b`).test(l)));
    if (!crit) noCrit.push(o.sourceId as string);
    const ev = body.map((l) => /\bE[0-3]\b/.exec(l)?.[0]).find(Boolean);
    const id = o.sourceId as string;
    const viaQuestion = acquisitions.some(
      (a) => a["acquisitionMode"] === "QUESTION" && (a["variableRefs"] as string[]).includes(id),
    );
    const resolution = viaQuestion
      ? "ACQUISITION_EXPLICIT"
      : correspondence.has(id)
        ? "GOVERNED_STRUCTURAL_CORRESPONDENCE"
        : progressiveSet.has(id)
          ? "CAPABILITY_PROGRESSIVE"
          : fed.has(id)
            ? informationNeeds.some(
                (n) =>
                  n.mappingStatus === "GOVERNED_STRUCTURAL_MAPPING" && n.variableRefs.includes(id),
              )
              ? "GOVERNED_STRUCTURAL_MAPPING"
              : "INFORMATION_NEED"
            : "UNRESOLVED";
    if (resolution === "UNRESOLVED") unresolved.push(id);
    variables.push({
      id,
      name: String(o.fields["title"] ?? o.fields["heading"]),
      criticality: crit ?? NOT_EXPLICIT_MARK,
      minimumEvidence: ev ?? NOT_EXPLICIT_MARK,
      ...(ev ? {} : { minimumEvidenceResolution: "NOT_EXPLICIT" }),
      semanticStates: null,
      acquisitionResolution: resolution,
      ...(resolution === "UNRESOLVED"
        ? {
            acquisitionNote:
              "la fuente no vincula explícitamente ninguna NI ni pregunta a esta VA (sin contención estructural, fila de tabla ni relación de ID); no se asocia por ordinal ni similitud",
          }
        : {}),
    });
  }
  if (noCrit.length)
    gaps.push({
      id: `NE-${cap}-CRITICALITY`,
      kind: "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER",
      statement: `Criticidad no declarada por la fuente para ${noCrit.join(", ")}; preservada como NOT_EXPLICIT (modo de resolución NOT_EXPLICIT), sin inferir nivel.`,
      publicationBlocking: false,
    });
  if (unresolved.length)
    gaps.push({
      id: `NE-${cap}-VA-ACQUISITION`,
      kind: "ACQUISITION_SEMANTICS_MISSING",
      statement: `Sin vínculo explícito NI/pregunta → VA para ${unresolved.join(", ")}: el runtime no puede admitir observaciones para estas VA. Requiere vínculo gobernado por la fuente o decisión humana; no se infiere.`,
      publicationBlocking: true,
    });

  const stats = {
    variables: variables.length,
    informationNeeds: informationNeeds.length,
    linkedInformationNeeds: informationNeeds.filter((n) => n.variableRefs.length).length,
    acquisitions: acquisitions.length,
    questionAcquisitions: acquisitions.filter((a) => a["acquisitionMode"] === "QUESTION").length,
    acquisitionStages: stages.length,
    conditions: conditions.length,
    variablesWithAcquisitionPath: variables.length - unresolved.length,
    variablesUnresolved: unresolved.length,
    criticalityNotExplicit: noCrit.length,
  };
  if (b.length)
    return {
      capabilityId: cap,
      ok: false,
      source: null,
      blockers: b,
      stats,
      definition,
      checksum: null,
    };

  const capability = {
    id: cap,
    domainId: cap.slice(0, 2),
    name: identity!.name,
    definition: definition.text ?? NOT_EXPLICIT_MARK,
    definitionStatus: definition.status === "EXPLICIT" ? "EXPLICIT" : "NOT_EXPLICIT",
    ...(definition.sourceLines ? { definitionSourceLines: definition.sourceLines } : {}),
  };
  const body = {
    master: baseline.master,
    capability,
    provenance: {
      sourceReference: `canonical-baseline.json#${baseline.baselineId}@${baseline.checksum}${baseline.historicalStatus?.marker ? ` · ${baseline.historicalStatus.marker}` : ""}`,
      extractionStatus: "APPROVED",
      derivation: "MASTER_TRANSCRIPTION",
      derivationNote:
        "Proyección genérica determinista (M2-FACTORY-CONTRACT-03) desde baseline canónica aceptada + estructura explícita de la fuente raw sellada.",
      approvedBy: "PROJECT_OWNER / KNOWLEDGE_GOVERNANCE_AUTHORITY",
      approvedAt: "2026-09-24",
    },
    targetPack: { packId: cap.toLowerCase(), packVersion: "1.0.0" },
    sections: {
      capability,
      conditionsOfExistence: conditions,
      variables,
      informationNeeds,
      ...(ordinalCheck?.applied && options.governedOrdinalMapping
        ? {
            governedStructuralMapping: (() => {
              const { rule, ...decisionRest } = options.governedOrdinalMapping;
              return {
                rule,
                nature:
                  "interpretación estructural gobernada de la fuente; la fuente no declara literalmente el vínculo",
                ...decisionRest,
                ...ordinalCheck,
              };
            })(),
          }
        : {}),
      acquisitions,
      ...(stages.length ? { acquisitionStages: stages } : {}),
    },
    gaps,
  };
  const checksum = computeChecksum(body);
  return {
    capabilityId: cap,
    ok: true,
    source: { ...body, checksum },
    blockers: [],
    stats,
    definition,
    ordinalMapping: ordinalCheck,
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
    input.rawText.split("\n").findIndex((l) => l.replace(/^#{1,9}\s+/, "").trim() === literal) + 1;
  if (line === 0)
    return { ok: false, reason: `identidad «${literal}» no aparece literal en la fuente` };
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
