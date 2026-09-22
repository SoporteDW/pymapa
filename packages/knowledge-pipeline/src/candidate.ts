/**
 * Frontera de extracción de candidatos (M2-FACTORY-01 · B3).
 *
 *   texto raw registrado → CANDIDATO (clasificado, anclado) → revisión canónica
 *   humana → baseline canónica
 *
 * Un candidato NUNCA es conocimiento aprobado. Puede producirse por
 * herramienta determinista, transcripción humana o asistencia de IA; en todos
 * los casos permanece `status: "CANDIDATE"` hasta una aceptación canónica
 * humana ligada a su checksum exacto.
 *
 * Reglas duras (FAIL):
 * - todo texto de un ítem aparece literal en su rango de líneas;
 * - NOT_EXPLICIT / SOURCE_CONTENT_NOT_RECOVERED no llevan contenido (silencio);
 * - SUPERSEDED declara por qué ítem es sustituido;
 * - la cronología nunca promueve un draft: FINAL_APPROVED exige evidencia
 *   literal de aprobación/cierre;
 * - el cierre histórico (K4) es provenance, no publicación técnica actual.
 */
import { z } from "zod";
import { computeSelfChecksum, verifySelfChecksum } from "./checksum.ts";
import type { CanonicalBaseline } from "./canonical-baseline.ts";
import { BASELINE_STATUS, MASTER_IDENTITY } from "./master.ts";
import type { RawSourceRegistration } from "./raw-source.ts";
import type { RuntimeExtensionRegistry } from "./runtime-extensions.ts";

export const CANDIDATE_CLASSIFICATIONS = [
  "FINAL_APPROVED",
  "HISTORICAL_DRAFT",
  "SUPERSEDED",
  "GOVERNED_BACKLOG",
  "TRANSVERSAL_CANDIDATE",
  "NOT_EXPLICIT",
  "SOURCE_CONTENT_NOT_RECOVERED",
  "POTENTIAL_TRANSCRIPTION_DEFECT",
  "GENERIC_RUNTIME_EXTENSION_REQUIRED",
] as const;
export type CandidateClassification = (typeof CANDIDATE_CLASSIFICATIONS)[number];

/** Clasificaciones que se proyectan como objetos de la baseline canónica. */
const OBJECT_CLASSES: readonly CandidateClassification[] = ["FINAL_APPROVED", "GOVERNED_BACKLOG", "TRANSVERSAL_CANDIDATE"];
/** Clasificaciones que representan silencio o necesidad de gobierno (texto del operador, no conocimiento). */
const STATEMENT_CLASSES: readonly CandidateClassification[] = [
  "NOT_EXPLICIT",
  "SOURCE_CONTENT_NOT_RECOVERED",
  "POTENTIAL_TRANSCRIPTION_DEFECT",
  "GENERIC_RUNTIME_EXTENSION_REQUIRED",
];
const SILENT_CLASSES: readonly CandidateClassification[] = ["NOT_EXPLICIT", "SOURCE_CONTENT_NOT_RECOVERED"];

const lineRange = z.tuple([z.number().int().positive(), z.number().int().positive()]);
const fieldValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.array(fieldValue), z.record(z.string(), fieldValue)]),
);

export const candidateItemSchema = z.object({
  key: z.string().min(1),
  classification: z.enum(CANDIDATE_CLASSIFICATIONS),
  objectType: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  sourceId: z.string().min(1).nullable(),
  fields: z.record(z.string(), fieldValue),
  sourceLines: lineRange.nullable(),
  role: z.string().optional(),
  provenance: z.object({ classes: z.array(z.string().min(1)).min(1), sourceLines: lineRange }).optional(),
  annotations: z
    .array(z.object({ relation: z.string().min(1), fields: z.record(z.string(), fieldValue), sourceLines: lineRange }))
    .optional(),
  /** Evidencia literal de aprobación/cierre (obligatoria para FINAL_APPROVED). */
  approvalEvidence: z.object({ text: z.string().min(1), sourceLines: lineRange }).optional(),
  supersededBy: z.string().min(1).optional(),
  /** Texto del operador para clases de silencio/gobierno: NO es conocimiento. */
  statement: z.string().min(1).optional(),
  semanticCapability: z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional(),
  affectedObjectKeys: z.array(z.string().min(1)).optional(),
  publicationBlocking: z.boolean().optional(),
});
export type CandidateItem = z.infer<typeof candidateItemSchema>;

export const extractionCandidateSchema = z.object({
  $schema: z.string().optional(),
  candidateId: z.string().min(1),
  capabilityId: z.string().regex(/^[A-Z]{2}-\d{2}$/),
  status: z.literal("CANDIDATE"),
  registration: z.object({ registrationId: z.string().min(1), textSha256: z.string().regex(/^[0-9a-f]{64}$/) }),
  producedBy: z.object({
    method: z.enum(["DETERMINISTIC_TOOL", "HUMAN_TRANSCRIPTION", "AI_ASSISTED"]),
    agent: z.string().min(1),
    note: z.string().optional(),
  }),
  baselineId: z.string().min(1).nullable(),
  historicalStatus: z.object({ marker: z.string().min(1), sourceLines: lineRange }).nullable(),
  provenanceVocabulary: z.array(
    z.object({ code: z.string().min(1), label: z.string().min(1), meaning: z.string().min(1), sourceLines: lineRange }),
  ),
  controlCounts: z.array(
    z.object({
      label: z.string().min(1),
      declared: z.number().int().nonnegative(),
      objectType: z.string().min(1),
      role: z.string().optional(),
      sourceLines: lineRange,
    }),
  ),
  verbatimKeys: z.array(z.string().min(1)).min(1),
  items: z.array(candidateItemSchema).min(1),
  checksum: z.string().regex(/^sha256:[0-9a-f]{64}$/),
});
export type ExtractionCandidate = z.infer<typeof extractionCandidateSchema>;

export interface CandidateIssue {
  code:
    | "SCHEMA"
    | "CHECKSUM"
    | "IDENTITY"
    | "DUPLICATE_KEY"
    | "LINE_RANGE"
    | "NOT_VERBATIM"
    | "SOURCE_ANCHOR_MISSING"
    | "SILENCE_FILLED"
    | "STATEMENT_MISSING"
    | "APPROVAL_EVIDENCE_MISSING"
    | "SUPERSESSION"
    | "UNRESOLVED_REFERENCE"
    | "UNKNOWN_PROVENANCE_CLASS"
    | "CONTROL_COUNT_MISMATCH"
    | "POTENTIAL_TRANSCRIPTION_DEFECT"
    | "RUNTIME_EXTENSION_UNREGISTERED"
    | "RUNTIME_EXTENSION_OPEN"
    | "RUNTIME_EXTENSION_INCOMPLETE"
    | "AI_ASSISTED_EXTRACTION"
    | "HISTORICAL_STATUS_MISSING";
  severity: "FAIL" | "REVIEW";
  itemKey: string | null;
  sourceLines: [number, number] | null;
  message: string;
}

export interface CandidateSummary {
  itemCount: number;
  byClassification: Record<CandidateClassification, number>;
  objectCandidateCount: number;
  notExplicitCount: number;
  sourceContentNotRecoveredCount: number;
  potentialTranscriptionDefectCount: number;
  runtimeExtensionCount: number;
}

export interface CandidateValidation {
  ok: boolean;
  candidate: ExtractionCandidate | null;
  issues: CandidateIssue[];
  summary: CandidateSummary | null;
}

function* hojas(valor: unknown): Generator<string> {
  if (typeof valor === "string") yield valor;
  else if (Array.isArray(valor)) for (const v of valor) yield* hojas(v);
  else if (valor && typeof valor === "object") for (const v of Object.values(valor as Record<string, unknown>)) yield* hojas(v);
}

function* refs(valor: Record<string, unknown>): Generator<[string, string]> {
  for (const [k, v] of Object.entries(valor)) {
    if (!/Refs?$/.test(k)) continue;
    for (const h of hojas(v)) yield [k, h];
  }
}

export function validateExtractionCandidate(input: {
  candidate: unknown;
  registration: RawSourceRegistration;
  rawText: string;
  extensionRegistry: RuntimeExtensionRegistry | null;
}): CandidateValidation {
  const parsed = extractionCandidateSchema.safeParse(input.candidate);
  if (!parsed.success) {
    return {
      ok: false,
      candidate: null,
      summary: null,
      issues: parsed.error.issues.map((i) => ({
        code: "SCHEMA" as const,
        severity: "FAIL" as const,
        itemKey: null,
        sourceLines: null,
        message: `${i.path.join(".")}: ${i.message}`,
      })),
    };
  }
  const c = parsed.data;
  const issues: CandidateIssue[] = [];
  const add = (
    code: CandidateIssue["code"],
    severity: CandidateIssue["severity"],
    message: string,
    itemKey: string | null = null,
    sourceLines: [number, number] | null = null,
  ) => issues.push({ code, severity, message, itemKey, sourceLines });

  const self = verifySelfChecksum(input.candidate as Record<string, unknown>);
  if (!self.ok) add("CHECKSUM", "FAIL", `checksum del candidato inválido (esperado ${self.expected})`);
  const reg = input.registration;
  if (c.capabilityId !== reg.capabilityId) add("IDENTITY", "FAIL", `candidato de ${c.capabilityId} sobre registro de ${reg.capabilityId}`);
  if (c.registration.registrationId !== reg.registrationId) add("IDENTITY", "FAIL", `registrationId ${c.registration.registrationId} ≠ ${reg.registrationId}`);
  if (!reg.text || c.registration.textSha256 !== reg.text.sha256)
    add("IDENTITY", "FAIL", "el candidato no está anclado al texto registrado vigente (textSha256)");

  const lines = input.rawText.split("\n");
  const rango = ([a, b]: [number, number]) => lines.slice(a - 1, b).join("\n");
  const rangoValido = (r: [number, number], key: string | null) => {
    if (r[0] > r[1] || r[1] > lines.length) {
      add("LINE_RANGE", "FAIL", `rango ${r[0]}–${r[1]} fuera del texto (${lines.length} líneas)`, key, r);
      return false;
    }
    return true;
  };
  const literal = (texto: string, r: [number, number], key: string | null, ruta: string) => {
    if (!rango(r).includes(texto))
      add("NOT_VERBATIM", "FAIL", `${ruta}: "${texto.slice(0, 80)}" no aparece literal en ${r[0]}–${r[1]}`, key, r);
  };

  if (c.historicalStatus && rangoValido(c.historicalStatus.sourceLines, null))
    literal(c.historicalStatus.marker, c.historicalStatus.sourceLines, null, "historicalStatus.marker");
  const vocab = new Set<string>();
  for (const v of c.provenanceVocabulary) {
    vocab.add(v.code);
    if (rangoValido(v.sourceLines, null)) {
      literal(v.code, v.sourceLines, null, `provenanceVocabulary.${v.code}.code`);
      literal(v.label, v.sourceLines, null, `provenanceVocabulary.${v.code}.label`);
    }
  }

  const keys = new Map<string, CandidateItem>();
  const sourceIds = new Set<string>();
  for (const item of c.items) {
    if (keys.has(item.key)) add("DUPLICATE_KEY", "FAIL", `clave duplicada ${item.key}`, item.key);
    keys.set(item.key, item);
    if (item.sourceId) sourceIds.add(item.sourceId);
  }

  for (const item of c.items) {
    const k = item.key;
    const r = item.sourceLines;
    const silent = SILENT_CLASSES.includes(item.classification);
    if (!r && !silent) {
      add("SOURCE_ANCHOR_MISSING", "FAIL", `${item.classification} exige sourceLines`, k);
    }
    if (silent && (Object.keys(item.fields).length > 0 || item.annotations?.length)) {
      add("SILENCE_FILLED", "FAIL", `${item.classification} no puede contener contenido: el silencio de la fuente se preserva`, k, r);
    }
    if (STATEMENT_CLASSES.includes(item.classification) && !item.statement)
      add("STATEMENT_MISSING", "FAIL", `${item.classification} exige statement del operador (no conocimiento)`, k, r);

    if (r && rangoValido(r, k)) {
      for (const h of hojas(item.fields)) literal(h, r, k, `${k}.fields`);
      if (item.sourceId) literal(item.sourceId, r, k, `${k}.sourceId`);
    }
    for (const a of item.annotations ?? [])
      if (rangoValido(a.sourceLines, k)) for (const h of hojas(a.fields)) literal(h, a.sourceLines, k, `${k}.annotations.${a.relation}`);
    if (item.provenance) {
      item.provenance.classes
        .filter((cl) => !vocab.has(cl))
        .forEach((cl) => add("UNKNOWN_PROVENANCE_CLASS", "FAIL", `clase de provenance ${cl} no declarada por la fuente`, k));
      if (rangoValido(item.provenance.sourceLines, k))
        item.provenance.classes.forEach((cl) => literal(cl, item.provenance!.sourceLines, k, `${k}.provenance`));
    }
    if (item.approvalEvidence && rangoValido(item.approvalEvidence.sourceLines, k))
      literal(item.approvalEvidence.text, item.approvalEvidence.sourceLines, k, `${k}.approvalEvidence`);

    if (item.classification === "FINAL_APPROVED" && !item.approvalEvidence)
      add(
        "APPROVAL_EVIDENCE_MISSING",
        "REVIEW",
        `${k}: FINAL_APPROVED sin evidencia literal de aprobación/cierre; la posición cronológica no basta. Citar el marcador de aprobación o reclasificar como HISTORICAL_DRAFT`,
        k,
        r,
      );
    if (item.classification === "SUPERSEDED") {
      const target = item.supersededBy ? keys.get(item.supersededBy) : undefined;
      if (!item.supersededBy || !target) add("SUPERSESSION", "FAIL", `${k}: SUPERSEDED exige supersededBy existente`, k, r);
      else if (target.classification === "SUPERSEDED" || target.classification === "HISTORICAL_DRAFT")
        add("SUPERSESSION", "REVIEW", `${k}: sustituido por ${target.key} (${target.classification}); la cadena de supersesión no termina en un objeto aprobado`, k, r);
      else if (![...hojas(item.fields)].length || ![...hojas(target.fields)].length)
        add("SUPERSESSION", "FAIL", `${k}: la supersesión exige texto literal en ambos extremos`, k, r);
    } else if (item.supersededBy) {
      add("SUPERSESSION", "FAIL", `${k}: solo SUPERSEDED puede declarar supersededBy`, k, r);
    }
    if (item.classification === "POTENTIAL_TRANSCRIPTION_DEFECT")
      add("POTENTIAL_TRANSCRIPTION_DEFECT", "REVIEW", `${k}: ${item.statement ?? "defecto potencial de transcripción"} — contrastar ${r ? `líneas ${r[0]}–${r[1]}` : "la fuente"} y corregir o descartar antes de aceptar la baseline`, k, r);

    if (item.classification === "GENERIC_RUNTIME_EXTENSION_REQUIRED") {
      if (!item.semanticCapability || !item.affectedObjectKeys?.length || item.publicationBlocking === undefined)
        add("RUNTIME_EXTENSION_INCOMPLETE", "FAIL", `${k}: exige semanticCapability, affectedObjectKeys y publicationBlocking`, k, r);
      (item.affectedObjectKeys ?? [])
        .filter((x) => !keys.has(x))
        .forEach((x) => add("UNRESOLVED_REFERENCE", "FAIL", `${k}: objeto afectado ${x} inexistente`, k, r));
      const e = input.extensionRegistry?.entries.find((x) => x.occurrences.some((o) => o.capabilityId === c.capabilityId && o.gapId === k));
      if (!e)
        add("RUNTIME_EXTENSION_UNREGISTERED", "REVIEW", `${k}: registrar la ocurrencia en knowledge/factory/runtime-extensions.json (semántica ${item.semanticCapability ?? "?"}) o vincularla a una extensión existente`, k, r);
      else if (e.status === "OPEN")
        add("RUNTIME_EXTENSION_OPEN", "REVIEW", `${k}: ${e.extensionId} (${e.semanticCapability}) sigue OPEN; requiere extensión genérica del engine${e.publicationBlockingWhileOpen || item.publicationBlocking ? " y bloquea publicación" : ""}`, k, r);
    }
    for (const [campo, valor] of refs(item.fields))
      if (!sourceIds.has(valor) && !keys.has(valor))
        add("UNRESOLVED_REFERENCE", "FAIL", `${k}.${campo} → ${valor} no resuelve a ningún ítem`, k, r);
  }

  for (const cc of c.controlCounts) {
    if (!rangoValido(cc.sourceLines, null)) continue;
    literal(String(cc.declared), cc.sourceLines, null, `controlCounts.${cc.label}`);
    const n = c.items.filter(
      (i) => i.classification === "FINAL_APPROVED" && i.objectType === cc.objectType && (cc.role === undefined || i.role === cc.role),
    ).length;
    if (n !== cc.declared)
      add("CONTROL_COUNT_MISMATCH", "REVIEW", `${cc.label}: la fuente declara ${cc.declared} y el candidato materializa ${n} ${cc.objectType} FINAL_APPROVED; posible omisión o duplicado de transcripción (líneas ${cc.sourceLines[0]}–${cc.sourceLines[1]})`, null, cc.sourceLines);
  }
  if (!c.historicalStatus)
    add("HISTORICAL_STATUS_MISSING", "REVIEW", "sin marcador histórico literal: la revisión canónica debe confirmar el estado de cierre de la fuente");
  if (c.producedBy.method === "AI_ASSISTED")
    add("AI_ASSISTED_EXTRACTION", "REVIEW", `extracción asistida por IA (${c.producedBy.agent}): cada ítem FINAL_APPROVED permanece como dato candidato hasta la aceptación canónica humana`);

  const byClassification = Object.fromEntries(CANDIDATE_CLASSIFICATIONS.map((k) => [k, 0])) as Record<CandidateClassification, number>;
  c.items.forEach((i) => {
    byClassification[i.classification] += 1;
  });
  return {
    ok: !issues.some((i) => i.severity === "FAIL"),
    candidate: c,
    issues,
    summary: {
      itemCount: c.items.length,
      byClassification,
      objectCandidateCount: c.items.filter((i) => OBJECT_CLASSES.includes(i.classification)).length,
      notExplicitCount: byClassification.NOT_EXPLICIT,
      sourceContentNotRecoveredCount: byClassification.SOURCE_CONTENT_NOT_RECOVERED,
      potentialTranscriptionDefectCount: byClassification.POTENTIAL_TRANSCRIPTION_DEFECT,
      runtimeExtensionCount: byClassification.GENERIC_RUNTIME_EXTENSION_REQUIRED,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Aceptación canónica humana → baseline                               */
/* ------------------------------------------------------------------ */

export const canonicalAcceptanceSchema = z.object({
  capabilityId: z.string().regex(/^[A-Z]{2}-\d{2}$/),
  candidateChecksum: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  decision: z.enum(["ACCEPTED", "REJECTED", "CHANGES_REQUESTED"]),
  reviewer: z.string().min(1),
  reviewedAt: z.string().min(1),
  notes: z.string().optional(),
});
export type CanonicalAcceptance = z.infer<typeof canonicalAcceptanceSchema>;

export type PromotionResult =
  | { ok: true; baseline: CanonicalBaseline }
  | { ok: false; reasons: string[] };

/**
 * Proyección mecánica candidato → baseline canónica. Solo con aceptación
 * humana ACCEPTED ligada al checksum exacto del candidato, sin FAIL, sin
 * defectos de transcripción pendientes y con marcador histórico literal.
 */
export function promoteCandidateToCanonicalBaseline(input: {
  validation: CandidateValidation;
  acceptance: unknown;
  registration: RawSourceRegistration;
  rawRef: string;
  sourceRef: string;
}): PromotionResult {
  const reasons: string[] = [];
  const c = input.validation.candidate;
  if (!c) return { ok: false, reasons: ["candidato inválido"] };
  const acc = canonicalAcceptanceSchema.safeParse(input.acceptance);
  if (!acc.success) reasons.push("falta canonical-acceptance.json válido");
  else {
    if (acc.data.decision !== "ACCEPTED") reasons.push(`decisión canónica ${acc.data.decision}`);
    if (acc.data.candidateChecksum !== c.checksum) reasons.push("la aceptación no corresponde al checksum vigente del candidato");
    if (acc.data.capabilityId !== c.capabilityId) reasons.push("la aceptación es de otra capacidad");
  }
  input.validation.issues
    .filter((i) => i.severity === "FAIL")
    .forEach((i) => reasons.push(`FAIL ${i.code}: ${i.message}`));
  input.validation.issues
    .filter((i) => i.code === "POTENTIAL_TRANSCRIPTION_DEFECT" || i.code === "APPROVAL_EVIDENCE_MISSING" || i.code === "CONTROL_COUNT_MISMATCH")
    .forEach((i) => reasons.push(`pendiente ${i.code}: ${i.message}`));
  if (!c.historicalStatus) reasons.push("historicalStatus requerido para la baseline");
  if (!c.baselineId) reasons.push("baselineId requerido para la baseline");
  if (c.provenanceVocabulary.length === 0) reasons.push("provenanceVocabulary vacío");
  const reg = input.registration;
  if (!reg.text) reasons.push("registro sin texto");
  if (reasons.length > 0 || !c.historicalStatus || !c.baselineId || !reg.text) return { ok: false, reasons };

  const byKey = new Map(c.items.map((i) => [i.key, i]));
  const first = (i: CandidateItem) => [...hojas(i.fields)][0] as string;
  const objects = c.items
    .filter((i) => OBJECT_CLASSES.includes(i.classification))
    .map((i) => ({
      key: i.key,
      objectType: i.objectType,
      sourceId: i.sourceId,
      fields: i.fields,
      sourceLines: i.sourceLines as [number, number],
      ...(i.role !== undefined ? { role: i.role } : {}),
      ...(i.provenance !== undefined ? { provenance: i.provenance } : {}),
      ...(i.annotations !== undefined ? { annotations: i.annotations } : {}),
    }));
  const supersessions = c.items
    .filter((i) => i.classification === "SUPERSEDED" && i.supersededBy)
    .map((i) => {
      const t = byKey.get(i.supersededBy as string) as CandidateItem;
      return {
        relation: "SUPERSEDED_BY" as const,
        superseded: { text: first(i), sourceLines: i.sourceLines as [number, number] },
        supersededBy: { text: first(t), sourceLines: t.sourceLines as [number, number], objectKey: t.key },
      };
    });
  const gapKind = {
    NOT_EXPLICIT: "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER",
    SOURCE_CONTENT_NOT_RECOVERED: "SOURCE_CONTENT_NOT_RECOVERED",
    GENERIC_RUNTIME_EXTENSION_REQUIRED: "GENERIC_RUNTIME_EXTENSION_REQUIRED",
  } as const;
  const gaps = c.items
    .filter((i): i is CandidateItem & { classification: keyof typeof gapKind } => i.classification in gapKind)
    .map((i) => ({
      id: i.key,
      kind: gapKind[i.classification],
      statement: i.statement as string,
      publicationBlocking: i.publicationBlocking ?? false,
      objectTypes: [i.objectType],
    }));
  const body = {
    baselineId: c.baselineId,
    capabilityId: c.capabilityId,
    master: { identity: MASTER_IDENTITY, version: reg.masterVersion, baselineStatus: BASELINE_STATUS },
    historicalStatus: c.historicalStatus,
    rawSource: {
      ref: input.rawRef,
      sha256: reg.text.sha256,
      byteLength: reg.text.byteLength,
      lineCount: reg.text.lineCount,
      transcription: {
        tool: `${reg.extraction.extractorId} ${reg.extraction.extractorVersion}`,
        arguments: reg.extraction.externalTool ? `${reg.extraction.externalTool.name} ${reg.extraction.externalTool.version}` : "",
      },
      originalDocument: { filename: reg.original.filename, byteLength: reg.original.byteLength, sha256: reg.original.sha256 },
    },
    provenanceVocabulary: c.provenanceVocabulary,
    controlCounts: c.controlCounts,
    objects,
    supersessions,
    executableProjection: {
      sourceRef: input.sourceRef,
      verbatimKeys: c.verbatimKeys,
      projectedObjectTypes: [],
      canonicalOnlyGapRefs: gaps.filter((g) => g.kind === "GENERIC_RUNTIME_EXTENSION_REQUIRED").map((g) => g.id),
    },
    gaps,
    transcriptionCorrections: [],
  };
  return { ok: true, baseline: { ...body, checksum: computeSelfChecksum(body) } as CanonicalBaseline };
}
