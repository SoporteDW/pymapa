/**
 * Pipeline de validación en etapas separadas.
 *
 *   A. STRUCTURAL              → contrato knowledge-pack.schema
 *   B. REFERENTIAL             → IDs y relaciones internas
 *   C. GOVERNANCE              → procedencia, inferencia no autorizada, gaps bloqueantes
 *   D. RUNTIME_COMPATIBILITY   → primitivas soportadas por el Knowledge Engine
 *
 * Una falla en cualquier etapa impide la publicación automática.
 */
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import { validateKnowledgePack } from "@pymapa/knowledge-schema";
import { sourceToPackDiff } from "./diff.ts";
import type { PackCandidate } from "./generator.ts";
import type { CapabilitySource } from "./master.ts";

export const VALIDATION_STAGES = [
  "STRUCTURAL",
  "REFERENTIAL",
  "GOVERNANCE",
  "RUNTIME_COMPATIBILITY",
] as const;
export type ValidationStage = (typeof VALIDATION_STAGES)[number];

export type ValidationCode =
  | "SCHEMA_INVALID"
  | "REFERENCE_UNKNOWN"
  | "DUPLICATE_ID"
  | "NEED_ACQUISITION_MISMATCH"
  | "PROVENANCE_MISSING"
  | "UNAUTHORIZED_INFERENCE"
  | "DETERMINISTIC_RULE_WITHOUT_EXPLICIT_BASIS"
  | "PUBLICATION_BLOCKING_GAP"
  | "GENERIC_RUNTIME_EXTENSION_REQUIRED"
  | "RUNTIME_LOAD_FAILED";

export interface ValidationIssue {
  stage: ValidationStage;
  code: ValidationCode;
  path: string;
  message: string;
}

export interface StageResult {
  stage: ValidationStage;
  ok: boolean;
  issues: ValidationIssue[];
}

/* ------------------------------------------------------------------ */
/* Primitivas soportadas por el runtime actual                         */
/* ------------------------------------------------------------------ */

export const SUPPORTED_ACQUISITION_LEVELS = ["P1", "P2", "P3", "P4", "P5"] as const;
export const SUPPORTED_RESPONSE_MODEL_KINDS = [
  "semantic_state_or_unknown",
  "free_statement_or_unknown",
] as const;
export const SUPPORTED_TRIGGER_CLASSIFICATIONS = ["DETERMINISTIC", "NOT_DETERMINISTIC"] as const;
export const SUPPORTED_RULE_CLASSIFICATIONS = [
  "DETERMINISTIC",
  "GOVERNED_JUDGMENT",
  "UNIMPLEMENTED_GAP",
] as const;
export const SUPPORTED_VALIDATION_CONDITION_KINDS = [
  "DISTINCT_SECOND_EXECUTOR",
  "CONSECUTIVE_CORRECT_CASES",
  "NO_CRITICAL_ASSISTANCE",
  /* M2-OP02-02: condiciones que exigen juicio humano registrado. */
  "GOVERNED_STATEMENT",
  "JUSTIFYING_CONDITION_REFERENCE",
] as const;

function issue(
  stage: ValidationStage,
  code: ValidationCode,
  path: string,
  message: string,
): ValidationIssue {
  return { stage, code, path, message };
}

/* ------------------------------------------------------------------ */
/* A. Structural                                                       */
/* ------------------------------------------------------------------ */

export function validateStructural(pack: unknown): StageResult {
  const resultado = validateKnowledgePack(pack);
  if (resultado.ok) return { stage: "STRUCTURAL", ok: true, issues: [] };
  return {
    stage: "STRUCTURAL",
    ok: false,
    issues: resultado.issues.map((i) => issue("STRUCTURAL", "SCHEMA_INVALID", i.path, i.message)),
  };
}

/* ------------------------------------------------------------------ */
/* B. Referential                                                      */
/* ------------------------------------------------------------------ */

interface PackLike {
  variables?: { id: string }[];
  informationNeeds?: { id: string; variableRefs: string[]; acquisitionRefs: string[] }[];
  acquisitions?: {
    id: string;
    informationNeedRef?: string;
    variableRefs: string[];
    level?: string;
    responseModel?: { kind: string };
    trigger?: { classification: string };
  }[];
  rules?: { id: string; classification: string; implemented: boolean; statement: string }[];
  findings?: { id: string; ruleRefs?: string[] }[];
  activities?: { id: string }[];
  interventionPatterns?: { id: string; deliverables?: { id: string }[] }[];
  recommendations?: { id: string; findingRefs?: string[] }[];
  validationRequirements?: {
    id: string;
    activityRef?: string;
    owner?: { kind: string; ref: string };
    conditions?: { id: string; kind: string }[];
  }[];
  evidence?: {
    candidates?: { id: string; variableRefs?: string[]; informationNeedRefs?: string[] }[];
  };
}

export function validateReferential(pack: unknown): StageResult {
  const p = pack as PackLike;
  const issues: ValidationIssue[] = [];
  const add = (code: ValidationCode, path: string, message: string) =>
    issues.push(issue("REFERENTIAL", code, path, message));

  const duplicados = (lista: { id: string }[] | undefined, path: string) => {
    const vistos = new Set<string>();
    (lista ?? []).forEach((item, i) => {
      if (vistos.has(item.id)) add("DUPLICATE_ID", `${path}.${i}.id`, `id duplicado: ${item.id}`);
      vistos.add(item.id);
    });
    return vistos;
  };

  const variables = duplicados(p.variables, "variables");
  const needs = duplicados(p.informationNeeds, "informationNeeds");
  const adquisiciones = duplicados(p.acquisitions, "acquisitions");
  duplicados(p.rules, "rules");
  duplicados(p.findings, "findings");
  duplicados(p.activities, "activities");
  duplicados(p.recommendations, "recommendations");

  // Coherencia bidireccional Information Need ↔ Acquisition.
  (p.informationNeeds ?? []).forEach((need, i) => {
    need.acquisitionRefs.forEach((ref) => {
      const acq = (p.acquisitions ?? []).find((a) => a.id === ref);
      if (!acq) {
        add(
          "REFERENCE_UNKNOWN",
          `informationNeeds.${i}.acquisitionRefs`,
          `adquisición desconocida: ${ref}`,
        );
        return;
      }
      if (acq.informationNeedRef && acq.informationNeedRef !== need.id) {
        add(
          "NEED_ACQUISITION_MISMATCH",
          `informationNeeds.${i}.acquisitionRefs`,
          `la adquisición ${ref} declara la necesidad ${acq.informationNeedRef}`,
        );
      }
    });
  });

  (p.acquisitions ?? []).forEach((acq, i) => {
    if (acq.informationNeedRef && !needs.has(acq.informationNeedRef)) {
      add("REFERENCE_UNKNOWN", `acquisitions.${i}.informationNeedRef`, `necesidad desconocida`);
    }
    acq.variableRefs.forEach((ref) => {
      if (!variables.has(ref)) {
        add("REFERENCE_UNKNOWN", `acquisitions.${i}.variableRefs`, `variable desconocida: ${ref}`);
      }
    });
  });

  (p.evidence?.candidates ?? []).forEach((cand, i) => {
    (cand.variableRefs ?? []).forEach((ref) => {
      if (!variables.has(ref)) {
        add(
          "REFERENCE_UNKNOWN",
          `evidence.candidates.${i}.variableRefs`,
          `variable desconocida: ${ref}`,
        );
      }
    });
    (cand.informationNeedRefs ?? []).forEach((ref) => {
      if (!needs.has(ref)) {
        add(
          "REFERENCE_UNKNOWN",
          `evidence.candidates.${i}.informationNeedRefs`,
          `necesidad desconocida: ${ref}`,
        );
      }
    });
  });

  // CRV: el dueño gobernado puede ser Activity, patrón de intervención o
  // deliverable. activityRef se conserva como forma retrocompatible.
  const actividades = new Set((p.activities ?? []).map((a) => a.id));
  const patrones = new Set((p.interventionPatterns ?? []).map((ip) => ip.id));
  const entregables = new Set(
    (p.interventionPatterns ?? []).flatMap((ip) => (ip.deliverables ?? []).map((d) => d.id)),
  );
  (p.validationRequirements ?? []).forEach((crv, i) => {
    const owner = crv.owner ?? (crv.activityRef ? { kind: "ACTIVITY", ref: crv.activityRef } : null);
    const campo = crv.owner ? "owner.ref" : "activityRef";
    if (!owner) {
      add("REFERENCE_UNKNOWN", `validationRequirements.${i}.owner`, `CRV sin dueño gobernado`);
      return;
    }
    const universo =
      owner.kind === "ACTIVITY"
        ? actividades
        : owner.kind === "INTERVENTION_PATTERN"
          ? patrones
          : owner.kind === "DELIVERABLE"
            ? entregables
            : new Set<string>();
    const etiqueta =
      owner.kind === "ACTIVITY"
        ? "actividad desconocida"
        : owner.kind === "INTERVENTION_PATTERN"
          ? "patrón de intervención desconocido"
          : "deliverable desconocido";
    if (!universo.has(owner.ref)) {
      add("REFERENCE_UNKNOWN", `validationRequirements.${i}.${campo}`, etiqueta);
    }
  });

  void adquisiciones;
  return { stage: "REFERENTIAL", ok: issues.length === 0, issues };
}

/* ------------------------------------------------------------------ */
/* C. Governance                                                       */
/* ------------------------------------------------------------------ */

export function validateGovernance(input: {
  source: CapabilitySource;
  candidate: PackCandidate;
}): StageResult {
  const { source, candidate } = input;
  const issues: ValidationIssue[] = [];
  const add = (code: ValidationCode, path: string, message: string) =>
    issues.push(issue("GOVERNANCE", code, path, message));

  const master = candidate.pack["knowledgeMaster"] as Record<string, unknown> | undefined;
  if (!master?.["sourceReference"]) {
    add("PROVENANCE_MISSING", "knowledgeMaster.sourceReference", "el pack no declara su fuente");
  }
  if (source.provenance.extractionStatus !== "APPROVED") {
    add(
      "PROVENANCE_MISSING",
      "provenance.extractionStatus",
      `extracción no aprobada: ${source.provenance.extractionStatus}`,
    );
  }

  const diff = sourceToPackDiff(source, candidate.pack);
  diff.addedContent.forEach((entrada) =>
    add("UNAUTHORIZED_INFERENCE", entrada.path, "contenido no declarado por la fuente gobernada"),
  );
  diff.semanticChanges.forEach((entrada) =>
    add("UNAUTHORIZED_INFERENCE", entrada.path, entrada.note),
  );
  diff.provenanceLoss.forEach((entrada) => add("PROVENANCE_MISSING", entrada.path, entrada.note));

  // Una regla DETERMINISTIC implementada exige base explícita en la fuente.
  const reglas = (candidate.pack["rules"] ?? []) as PackLike["rules"];
  (reglas ?? []).forEach((regla, i) => {
    if (regla.classification !== "DETERMINISTIC") return;
    const declarada = (source.sections["rules"] as PackLike["rules"] | undefined)?.find(
      (r) => r.id === regla.id,
    );
    if (!declarada || declarada.classification !== "DETERMINISTIC") {
      add(
        "DETERMINISTIC_RULE_WITHOUT_EXPLICIT_BASIS",
        `rules.${i}.classification`,
        `la regla ${regla.id} aparece como DETERMINISTIC sin base explícita en la fuente`,
      );
    }
  });

  source.gaps
    .filter((gap) => gap.publicationBlocking)
    .forEach((gap) =>
      add("PUBLICATION_BLOCKING_GAP", `gaps.${gap.id}`, `${gap.kind}: ${gap.statement}`),
    );

  return { stage: "GOVERNANCE", ok: issues.length === 0, issues };
}

/* ------------------------------------------------------------------ */
/* D. Runtime compatibility                                            */
/* ------------------------------------------------------------------ */

export function validateRuntimeCompatibility(pack: unknown): StageResult {
  const p = pack as PackLike;
  const issues: ValidationIssue[] = [];
  const add = (code: ValidationCode, path: string, message: string) =>
    issues.push(issue("RUNTIME_COMPATIBILITY", code, path, message));

  (p.acquisitions ?? []).forEach((acq, i) => {
    if (acq.level && !(SUPPORTED_ACQUISITION_LEVELS as readonly string[]).includes(acq.level)) {
      add(
        "GENERIC_RUNTIME_EXTENSION_REQUIRED",
        `acquisitions.${i}.level`,
        `nivel de adquisición no soportado: ${acq.level}`,
      );
    }
    if (
      acq.responseModel &&
      !(SUPPORTED_RESPONSE_MODEL_KINDS as readonly string[]).includes(acq.responseModel.kind)
    ) {
      add(
        "GENERIC_RUNTIME_EXTENSION_REQUIRED",
        `acquisitions.${i}.responseModel.kind`,
        `modelo de respuesta no soportado: ${acq.responseModel?.kind}`,
      );
    }
    if (
      acq.trigger &&
      !(SUPPORTED_TRIGGER_CLASSIFICATIONS as readonly string[]).includes(acq.trigger.classification)
    ) {
      add(
        "GENERIC_RUNTIME_EXTENSION_REQUIRED",
        `acquisitions.${i}.trigger.classification`,
        `clasificación de trigger no soportada: ${acq.trigger.classification}`,
      );
    }
  });

  (p.rules ?? []).forEach((regla, i) => {
    if (!(SUPPORTED_RULE_CLASSIFICATIONS as readonly string[]).includes(regla.classification)) {
      add(
        "GENERIC_RUNTIME_EXTENSION_REQUIRED",
        `rules.${i}.classification`,
        `clase de razonamiento no soportada por el runtime: ${regla.classification}`,
      );
    }
  });

  (p.validationRequirements ?? []).forEach((crv, i) => {
    (crv.conditions ?? []).forEach((cond, ci) => {
      if (!(SUPPORTED_VALIDATION_CONDITION_KINDS as readonly string[]).includes(cond.kind)) {
        add(
          "GENERIC_RUNTIME_EXTENSION_REQUIRED",
          `validationRequirements.${i}.conditions.${ci}.kind`,
          `condición de CRV no soportada: ${cond.kind}`,
        );
      }
    });
  });

  if (issues.length === 0) {
    try {
      createKnowledgeEngine(pack);
    } catch (error) {
      add(
        "RUNTIME_LOAD_FAILED",
        "pack",
        `el Knowledge Engine no pudo cargar el pack: ${(error as Error).message}`,
      );
    }
  }

  return { stage: "RUNTIME_COMPATIBILITY", ok: issues.length === 0, issues };
}

/* ------------------------------------------------------------------ */
/* Orquestación                                                        */
/* ------------------------------------------------------------------ */

export interface ValidationPipelineResult {
  ok: boolean;
  stages: StageResult[];
  issues: ValidationIssue[];
  requiresGenericRuntimeExtension: boolean;
}

export function runValidationPipeline(input: {
  source: CapabilitySource;
  candidate: PackCandidate;
}): ValidationPipelineResult {
  const pack = input.candidate.pack;
  const stages: StageResult[] = [
    validateStructural(pack),
    validateReferential(pack),
    validateGovernance(input),
    validateRuntimeCompatibility(pack),
  ];
  const issues = stages.flatMap((s) => s.issues);
  return {
    ok: issues.length === 0,
    stages,
    issues,
    requiresGenericRuntimeExtension: issues.some(
      (i) => i.code === "GENERIC_RUNTIME_EXTENSION_REQUIRED",
    ),
  };
}
