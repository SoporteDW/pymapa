/**
 * INT-01 · E1 · DocumentAdmissionBridge.
 *
 * Puente gobernado entre correspondencias documentales VALIDATED (Bloque 1)
 * y observaciones admitidas por el Knowledge Engine 0.2.0.
 *
 * REGLAS DURAS:
 * - Determinista, auditable e idempotente. Sin IA, sin inferencia semántica.
 * - VALIDATED MAPPING ≠ OBSERVACIÓN ADMITIDA ≠ ADQUISICIÓN RESPONDIDA ≠
 *   VARIABLE EVALUABLE ≠ SUFICIENCIA. Este puente SOLO crea observaciones
 *   físicas cuando existe correspondencia factual gobernada y verificable.
 * - La admisión factual exige target_type VARIABLE + factualCorrespondenceRef
 *   (adquisición del pack que alimenta esa variable). La validación temática
 *   (INFORMATION_NEED, EVIDENCE_CRITERION, ACQUISITION sin correspondencia
 *   factual) nunca crea observaciones.
 * - Adquisiciones CAPABILITY_PROGRESSIVE multimapeadas (p. ej. CM-05): sin
 *   correspondencia factual pregunta→variable gobernada, nunca se asigna
 *   valor a una variable genérica. Fail-closed.
 * - Toda observación candidata se valida con `engine.validateObservation`
 *   antes de persistir; si el Engine la rechaza, no se persiste.
 * - Idempotencia: control en lectura (documentProvenance.mappingId) + índice
 *   único parcial en base de datos (migración 0003). Reintentos y
 *   concurrencia nunca duplican la observación.
 * - Invalidación append-only (DEC-INT01-01): un mapping SUPERSEDED con
 *   observación admitida genera un registro de CONTROL
 *   (`value.documentControl`) que corrige a la observación anterior. El
 *   registro de control jamás llega al Engine (observacionesVigentes).
 * - No modifica Master, packs ni Engine. No descuenta adquisiciones del
 *   cuestionario (eso es E2).
 */
import type { KnowledgeEngine } from "@pymapa/knowledge-engine";
import type {
  DocumentMappingRecord,
  ObservationRecord,
  ProductionRepository,
} from "./puertos";
import { esAdquisicionDeCapacidad, observacionesVigentes } from "./caso-uso";

export interface DocumentAdmissionDeps {
  engine: KnowledgeEngine;
  repository: ProductionRepository;
  /** KnowledgeVersion fijada al Assessment. */
  knowledgeVersionId: string;
  now?: () => string;
}

export type DocumentAdmissionOutcome =
  | "ADMITTED"
  | "ALREADY_ADMITTED"
  | "INVALIDATED"
  | "ALREADY_INVALIDATED"
  | "REJECTED";

export interface DocumentAdmissionItemResult {
  mappingId: string;
  outcome: DocumentAdmissionOutcome;
  reason?: string;
  observationId?: string;
}

export interface DocumentAdmissionReport {
  assessmentId: string;
  organizationId: string;
  admitted: number;
  invalidated: number;
  rejected: { mappingId: string; reason: string }[];
  items: DocumentAdmissionItemResult[];
}

const ahora = () => new Date().toISOString();

function esRegistroControl(o: ObservationRecord): boolean {
  return Boolean(o.value.documentControl);
}

function mappingIdDe(o: ObservationRecord): string | null {
  return o.value.documentProvenance?.mappingId ?? o.value.documentControl?.mappingId ?? null;
}

/**
 * Verificación fail-closed de una correspondencia VALIDATED. Devuelve la
 * adquisición factual gobernada o el motivo de rechazo.
 */
function verificarAdmisibilidad(
  m: DocumentMappingRecord,
  deps: DocumentAdmissionDeps,
  params: { assessmentId: string; organizationId: string },
): { ok: true; acquisitionId: string } | { ok: false; reason: string } {
  if (m.organizationId !== params.organizationId) return { ok: false, reason: "ORGANIZATION_MISMATCH" };
  if (m.assessmentId !== params.assessmentId) return { ok: false, reason: "ASSESSMENT_MISMATCH" };
  if (m.knowledgeVersionId !== deps.knowledgeVersionId) return { ok: false, reason: "KNOWLEDGE_VERSION_MISMATCH" };
  if (m.capabilityId !== deps.engine.pack.capability.id) return { ok: false, reason: "CAPABILITY_MISMATCH" };
  if (m.knowledgePackId !== deps.engine.pack.packId || m.knowledgePackVersion !== deps.engine.pack.packVersion) {
    return { ok: false, reason: "PACK_VERSION_MISMATCH" };
  }
  if (!m.admissionBasis) return { ok: false, reason: "ADMISSION_BASIS_NOT_GOVERNED" };
  if (m.admissionBasis === "GOVERNED_RULE" && !m.admissionRuleRef) {
    return { ok: false, reason: "GOVERNED_RULE_REF_REQUIRED" };
  }
  if (m.admissionBasis === "HUMAN_VALIDATION" && !m.validatedBy) {
    return { ok: false, reason: "VALIDATOR_REQUIRED" };
  }
  // Admisión factual: solo variables con correspondencia factual gobernada.
  if (m.targetType !== "VARIABLE") return { ok: false, reason: "THEMATIC_MAPPING_NOT_FACTUAL" };
  if (!m.factualCorrespondenceRef) return { ok: false, reason: "FACTUAL_CORRESPONDENCE_REQUIRED" };
  const acq = deps.engine.getAcquisition(m.factualCorrespondenceRef) as
    | { id: string; acquisitionMode?: string; variableRefs: readonly string[] }
    | null;
  if (!acq) return { ok: false, reason: "FACTUAL_ACQUISITION_NOT_IN_PACK" };
  if (!acq.variableRefs.includes(m.targetRef)) {
    return { ok: false, reason: "FACTUAL_ACQUISITION_DOES_NOT_FEED_VARIABLE" };
  }
  if (esAdquisicionDeCapacidad(acq)) {
    return { ok: false, reason: "PROGRESSIVE_VARIABLE_WITHOUT_GOVERNED_FACTUAL_MAPPING" };
  }
  if (!m.interpretationStatement) return { ok: false, reason: "INTERPRETATION_STATEMENT_REQUIRED" };
  return { ok: true, acquisitionId: acq.id };
}

/**
 * Procesa las correspondencias documentales de un Assessment: admite las
 * VALIDATED con correspondencia factual gobernada e invalida (append-only)
 * las observaciones de mappings SUPERSEDED. Nunca toca observaciones manuales.
 */
export async function admitirCorrespondenciasDocumentales(
  deps: DocumentAdmissionDeps,
  params: { assessmentId: string; organizationId: string; actorUserId?: string | null },
): Promise<DocumentAdmissionReport> {
  const now = deps.now ?? ahora;
  const [mappings, observaciones] = await Promise.all([
    deps.repository.listDocumentMappings(params.assessmentId),
    deps.repository.listObservations(params.assessmentId),
  ]);
  const vigentes = observacionesVigentes(observaciones);
  const report: DocumentAdmissionReport = {
    assessmentId: params.assessmentId,
    organizationId: params.organizationId,
    admitted: 0,
    invalidated: 0,
    rejected: [],
    items: [],
  };

  for (const m of mappings) {
    // Aislamiento: una correspondencia de otra organización nunca se procesa.
    if (m.organizationId !== params.organizationId) {
      report.rejected.push({ mappingId: m.id, reason: "ORGANIZATION_MISMATCH" });
      report.items.push({ mappingId: m.id, outcome: "REJECTED", reason: "ORGANIZATION_MISMATCH" });
      continue;
    }

    const admitidaPrevia = observaciones.find(
      (o) => !esRegistroControl(o) && o.value.documentProvenance?.mappingId === m.id,
    );

    if (m.status === "CANDIDATE" || m.status === "REJECTED") {
      // Nunca se admiten; si existiera una admitida previa (inconsistencia),
      // no se toca: la invalidación la gobierna la transición a SUPERSEDED.
      report.rejected.push({ mappingId: m.id, reason: "STATUS_NOT_VALIDATED" });
      report.items.push({ mappingId: m.id, outcome: "REJECTED", reason: "STATUS_NOT_VALIDATED" });
      continue;
    }

    if (m.status === "SUPERSEDED") {
      const controlPrevio = observaciones.find(
        (o) => esRegistroControl(o) && mappingIdDe(o) === m.id,
      );
      if (controlPrevio) {
        report.items.push({ mappingId: m.id, outcome: "ALREADY_INVALIDATED", observationId: controlPrevio.id });
        continue;
      }
      if (!admitidaPrevia || !vigentes.some((o) => o.id === admitidaPrevia.id)) {
        report.items.push({ mappingId: m.id, outcome: "ALREADY_INVALIDATED" });
        continue;
      }
      // Invalidación append-only: registro de CONTROL que corrige a la
      // observación admitida. Nunca es observación diagnóstica.
      const control = await deps.repository.insertObservation({
        organizationId: params.organizationId,
        assessmentId: params.assessmentId,
        sourceResponseId: null,
        respondentId: null,
        variableRef: admitidaPrevia.variableRef,
        value: {
          knowledgeState: "UNKNOWN",
          semanticValue: null,
          acquisitionRef: admitidaPrevia.value.acquisitionRef,
          correctsObservationId: admitidaPrevia.id,
          documentControl: { kind: "INVALIDATION", mappingId: m.id },
        },
      });
      await deps.repository.insertAuditEvent({
        organizationId: params.organizationId,
        assessmentId: params.assessmentId,
        eventType: "DOCUMENT_OBSERVATION_INVALIDATED",
        subjectTable: "observations",
        subjectId: admitidaPrevia.id,
        actorUserId: params.actorUserId ?? null,
        detail: { mappingId: m.id, controlObservationId: control.id, at: now() },
      });
      report.invalidated += 1;
      report.items.push({ mappingId: m.id, outcome: "INVALIDATED", observationId: admitidaPrevia.id });
      continue;
    }

    // status === "VALIDATED"
    if (admitidaPrevia) {
      report.items.push({ mappingId: m.id, outcome: "ALREADY_ADMITTED", observationId: admitidaPrevia.id });
      continue;
    }
    const admisibilidad = verificarAdmisibilidad(m, deps, params);
    if (!admisibilidad.ok) {
      report.rejected.push({ mappingId: m.id, reason: admisibilidad.reason });
      report.items.push({ mappingId: m.id, outcome: "REJECTED", reason: admisibilidad.reason });
      continue;
    }

    const candidata = {
      organizationId: params.organizationId,
      assessmentId: params.assessmentId,
      sourceResponseId: null,
      respondentId: null,
      variableRef: m.targetRef,
      value: {
        knowledgeState: "KNOWN" as const,
        semanticValue: m.interpretationStatement!,
        acquisitionRef: admisibilidad.acquisitionId,
        documentProvenance: {
          mappingId: m.id,
          fragmentId: m.fragmentId,
          interpretationId: m.interpretationId,
          extractionId: m.extractionId,
          evidenceId: m.evidenceId,
          knowledgePackId: m.knowledgePackId,
          knowledgePackVersion: m.knowledgePackVersion,
        },
      },
    };

    // El Engine 0.2.0 es la autoridad de admisibilidad: si lo rechaza, no entra.
    const veredicto = deps.engine.validateObservation({
      id: "pending",
      variableRef: candidata.variableRef,
      acquisitionRef: candidata.value.acquisitionRef,
      knowledgeState: candidata.value.knowledgeState,
      semanticValue: candidata.value.semanticValue,
      sourceResponseId: null,
      evidenceIds: [m.evidenceId],
      recordedAt: now(),
    });
    if (!veredicto.ok) {
      report.rejected.push({ mappingId: m.id, reason: `ENGINE_REJECTED: ${veredicto.reason}` });
      report.items.push({ mappingId: m.id, outcome: "REJECTED", reason: `ENGINE_REJECTED: ${veredicto.reason}` });
      continue;
    }

    // El índice único parcial (migración 0003) garantiza idempotencia ante
    // concurrencia: un reintento duplicado viola el índice y se reporta.
    let insertada: ObservationRecord;
    try {
      insertada = await deps.repository.insertObservation(candidata);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("observations_document_mapping_unique") || msg.includes("duplicate key")) {
        report.items.push({ mappingId: m.id, outcome: "ALREADY_ADMITTED" });
        continue;
      }
      throw e;
    }
    await deps.repository.linkEvidenceToObservation({
      organizationId: params.organizationId,
      observationId: insertada.id,
      evidenceId: m.evidenceId,
    });
    await deps.repository.insertAuditEvent({
      organizationId: params.organizationId,
      assessmentId: params.assessmentId,
      eventType: "DOCUMENT_OBSERVATION_ADMITTED",
      subjectTable: "observations",
      subjectId: insertada.id,
      actorUserId: params.actorUserId ?? null,
      detail: {
        mappingId: m.id,
        fragmentId: m.fragmentId,
        extractionId: m.extractionId,
        evidenceId: m.evidenceId,
        variableRef: m.targetRef,
        acquisitionRef: admisibilidad.acquisitionId,
        admissionBasis: m.admissionBasis,
        at: now(),
      },
    });
    report.admitted += 1;
    report.items.push({ mappingId: m.id, outcome: "ADMITTED", observationId: insertada.id });
  }

  return report;
}
