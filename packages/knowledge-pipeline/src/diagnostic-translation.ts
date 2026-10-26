/**
 * KNOW-EXEC-03 · Traductor gobernado K4 → candidato de staging (no ejecutable).
 *
 * Reutilizable por capacidad (sin branching por capabilityId). Entradas:
 * - baseline canónico (texto histórico y procedencia por líneas);
 * - matriz semántica de Fase 2 (clasificación, referencias CE/VA/HF, excepciones);
 * - pack publicado v1.0.0 (solo para fijar su checksum como evidencia).
 *
 * INVARIANTES:
 * - Copia literal: el texto histórico sale del baseline, nunca de la matriz.
 * - Guardrails nunca se convierten en hallazgos ni se vinculan a HF.
 * - Referencia HF documental ≠ binding: binding/emission siempre false.
 * - No se crea predicado, umbral, severidad, prioridad ni pregunta.
 * - Lo faltante o divergente se registra como excepción y se continúa.
 */
import { stagingCandidateSchema, type StagingCandidate, type StagingException, type StagingRuleCandidate } from "@pymapa/knowledge-schema";
import { computeChecksum, sha256Hex } from "./checksum.ts";

export interface MatrixRuleRow {
  Capacidad: string;
  "Regla K4": string;
  "Tipo de objeto": string;
  "Título histórico": string;
  "Texto histórico íntegro (K4)": string;
  "CE relacionada": string | null;
  "VA relacionada": string | null;
  "Familia HF referida": string | null;
  "Guardrails / restricciones": string | null;
  "Excepción agrupada": string | null;
  "Excepción particular": string | null;
  Autoridad: string | null;
}
export interface MatrixRelationRow {
  Capacidad: string;
  Regla: string;
  "Familia HF histórica": string | null;
  "Binding ejecutable aprobado": string;
  "Emisión automática aprobada": string;
}
export interface MatrixPatternRow {
  Patrón: string;
  Alcance: string;
  "Excepción común": string;
  Autoridad: string;
}
export interface SemanticInput {
  inputId: string;
  sourceSha256: string;
  S1: MatrixRuleRow[];
  S2: MatrixRelationRow[];
  S3: MatrixPatternRow[];
}
export interface BaselineObject {
  key: string;
  objectType: string;
  fields: { title?: string; body?: string[] };
  sourceLines: [number, number];
}
export interface TranslationInput {
  capabilityId: string;
  baselinePath: string;
  baseline: { checksum: string; baselineId: string; objects: BaselineObject[] };
  publishedPackPath: string;
  publishedPack: unknown;
  semantic: SemanticInput;
}

const NO_ID = /^no identificad/i;
const refs = (v: string | null | undefined): string[] =>
  !v || NO_ID.test(v.trim()) ? [] : v.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
const norm = (s: string) => s.replace(/\r/g, "").trim();

export function translateCapability(input: TranslationInput): StagingCandidate {
  const { capabilityId, baseline, semantic } = input;
  const filas = semantic.S1.filter((r) => r.Capacidad === capabilityId);
  const relaciones = new Map(
    semantic.S2.filter((r) => r.Capacidad === capabilityId).map((r) => [r.Regla, r]),
  );
  const objetos = new Map(baseline.objects.map((o) => [o.key, o]));
  const excepciones: StagingException[] = [];
  const rules: StagingRuleCandidate[] = [];

  for (const fila of filas) {
    const ruleId = fila["Regla K4"];
    const obj = objetos.get(ruleId);
    if (!obj || !obj.fields.body) {
      excepciones.push({
        exceptionId: `${capabilityId}:MISSING:${ruleId}`,
        scope: capabilityId,
        kind: "MISSING_SOURCE",
        ruleIds: [ruleId],
        description: obj
          ? "El objeto existe en el baseline canónico pero sin cuerpo textual recuperado; no se reconstruye."
          : "La regla de la matriz no existe en el baseline canónico; no se reconstruye.",
        authority: "Autoridad de Conocimiento",
        status: "PENDING",
      });
      continue;
    }
    const textoBaseline = obj.fields.body.join("\n");
    if (norm(textoBaseline) !== norm(fila["Texto histórico íntegro (K4)"] ?? "")) {
      excepciones.push({
        exceptionId: `${capabilityId}:TEXT:${ruleId}`,
        scope: capabilityId,
        kind: "TEXT_DIVERGENCE",
        ruleIds: [ruleId],
        description: "El texto de la matriz difiere del baseline; prevalece el baseline canónico.",
        authority: "Autoridad de Conocimiento",
        status: "PENDING",
      });
    }
    const guardrail = /guardrail/i.test(fila["Tipo de objeto"]);
    const rel = relaciones.get(ruleId);
    const hf = guardrail ? [] : refs(rel?.["Familia HF histórica"] ?? fila["Familia HF referida"]);
    const va = refs(fila["VA relacionada"]);
    const exRefs = [fila["Excepción agrupada"]].filter((x): x is string => !!x);
    if (fila["Excepción particular"]) {
      const id = `${capabilityId}:${ruleId}:PARTICULAR`;
      exRefs.push(id);
      excepciones.push({
        exceptionId: id,
        scope: capabilityId,
        kind: "PARTICULAR",
        ruleIds: [ruleId],
        description: fila["Excepción particular"],
        authority: fila.Autoridad ?? "Autoridad de Conocimiento",
        status: "PENDING",
      });
    }
    rules.push({
      ruleId,
      role: guardrail ? "GUARDRAIL" : "DIAGNOSTIC_HISTORICAL",
      title: obj.fields.title ?? fila["Título histórico"],
      historicalText: textoBaseline,
      sourceRef: { baselinePath: input.baselinePath, objectKey: obj.key, sourceLines: obj.sourceLines },
      conditionRefs: refs(fila["CE relacionada"]),
      variableRefs: va,
      hfReferences: hf,
      hfLinkKind: hf.length > 0 ? "DOCUMENTAL_REFERENCE" : "NONE_IDENTIFIED",
      composite: hf.length > 1 || /compuest|multirregla/i.test(exRefs.join(" ") + (fila["Excepción particular"] ?? "")),
      restrictions: fila["Guardrails / restricciones"] ?? "",
      exceptionRefs: exRefs,
      predicate: null,
      executable: false,
      bindingApproved: false,
      emissionApproved: false,
    });
  }

  // Patrones S3 aplicables a esta capacidad (alcance explícito o transversal).
  const usados = new Set(rules.flatMap((r) => r.exceptionRefs));
  for (const p of semantic.S3) {
    const aplica = p.Alcance.includes(capabilityId) || /tres capacidades|reglas sin v/i.test(p.Alcance) || usados.has(p.Patrón);
    if (!aplica) continue;
    excepciones.push({
      exceptionId: p.Patrón,
      scope: p.Alcance,
      kind: /adquisici/i.test(p["Excepción común"]) ? "ACQUISITION" : "PATTERN",
      ruleIds: rules.filter((r) => r.exceptionRefs.includes(p.Patrón)).map((r) => r.ruleId),
      description: p["Excepción común"],
      authority: p.Autoridad,
      status: "PENDING",
    });
  }

  const cuerpo = {
    contract: "PYMAPA-DIAGNOSTIC-TRANSLATION-CANDIDATE" as const,
    contractVersion: "0.1.0" as const,
    capabilityId,
    status: "STAGING_CANDIDATE_NOT_EXECUTABLE" as const,
    publicationAuthorized: false as const,
    provenance: {
      baselinePath: input.baselinePath,
      baselineChecksum: baseline.checksum,
      historicalVersion: baseline.baselineId,
      semanticInputId: semantic.inputId,
      semanticInputSha256: semantic.sourceSha256,
      publishedPackPath: input.publishedPackPath,
      publishedPackChecksum: `sha256:${sha256Hex(JSON.stringify(input.publishedPack))}`,
    },
    rules,
    exceptions: excepciones,
    counts: {
      rules: rules.length,
      diagnostic: rules.filter((r) => r.role === "DIAGNOSTIC_HISTORICAL").length,
      guardrails: rules.filter((r) => r.role === "GUARDRAIL").length,
      withHfReference: rules.filter((r) => r.hfReferences.length > 0).length,
      composite: rules.filter((r) => r.composite).length,
      exceptions: excepciones.length,
      executable: 0 as const,
      emitted: 0 as const,
    },
  };
  return stagingCandidateSchema.parse({ ...cuerpo, checksum: computeChecksum(cuerpo) });
}

/** El staging nunca puede ser una ruta de carga del runtime. */
export const STAGING_ROOT = "knowledge/staging";
