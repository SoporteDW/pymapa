/**
 * Puertos de persistencia del vertical productivo (M1-D).
 *
 * Define la frontera entre el caso de uso y el almacenamiento. No contiene
 * SQL, ni cliente Supabase, ni conocimiento de ninguna capacidad: el pack
 * gobierna el contenido y el engine la evaluación.
 */
import type { KnowledgeState } from "@pymapa/knowledge-engine";

export interface AssessmentRecord {
  id: string;
  organizationId: string;
  caseId: string;
  /** KnowledgeVersion fijada al Assessment. Nunca se recalcula contra otra. */
  knowledgeVersionId: string;
  type: "BASELINE" | "REASSESSMENT" | "FOLLOW_UP";
  startedAt: string | null;
  closedAt: string | null;
  updatedAt: string;
}

export interface ResponseRecord {
  id: string;
  organizationId: string;
  assessmentId: string;
  submittedBy: string | null;
  /** Referencia de adquisición del pack, p. ej. "OP01-P01". */
  acquisitionRef: string;
  /** Entrada aportada por la persona, preservada tal cual. */
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ObservationRecord {
  id: string;
  organizationId: string;
  assessmentId: string;
  /** Trazabilidad opcional hacia la Response de origen. */
  sourceResponseId: string | null;
  variableRef: string;
  value: {
    knowledgeState: KnowledgeState;
    semanticValue: string | null;
    acquisitionRef: string;
    notApplicableReason?: string | null;
    conflictingObservationIds?: string[];
  };
  createdAt: string;
}

export type EvaluationRunTrigger =
  | "RESPONSE_ACCEPTED"
  | "EVIDENCE_ADDED"
  | "OBSERVATION_UPDATED"
  | "CONTRADICTION_RESOLVED"
  | "MANUAL_REEVALUATION"
  | "REASSESSMENT_STARTED"
  | "VALIDATION_COMPLETED";

export type EvaluationRunStatus =
  | "PENDING"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED"
  | "NEEDS_REVIEW";

export interface EvaluationRunRecord {
  id: string;
  organizationId: string;
  assessmentId: string;
  knowledgeVersionId: string;
  engineVersion: string;
  trigger: EvaluationRunTrigger;
  status: EvaluationRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface VariableEvaluationRecord {
  id: string;
  organizationId: string;
  evaluationRunId: string;
  variableRef: string;
  state: string;
  detail: Record<string, unknown> | null;
}

export interface InformationNeedStateRecord {
  id: string;
  organizationId: string;
  assessmentId: string;
  evaluationRunId: string | null;
  needRef: string;
  state: string;
  detail: Record<string, unknown> | null;
}

/** Puerto de persistencia. Toda escritura del vertical pasa por aquí. */
export interface ProductionRepository {
  getAssessment(assessmentId: string): Promise<AssessmentRecord | null>;
  insertResponse(input: Omit<ResponseRecord, "id" | "createdAt">): Promise<ResponseRecord>;
  insertObservation(input: Omit<ObservationRecord, "id" | "createdAt">): Promise<ObservationRecord>;
  listObservations(assessmentId: string): Promise<ObservationRecord[]>;
  listResponses(assessmentId: string): Promise<ResponseRecord[]>;
  createEvaluationRun(
    input: Omit<EvaluationRunRecord, "id" | "createdAt" | "completedAt">,
  ): Promise<EvaluationRunRecord>;
  completeEvaluationRun(
    runId: string,
    status: EvaluationRunStatus,
    completedAt: string,
  ): Promise<EvaluationRunRecord>;
  replaceVariableEvaluations(
    runId: string,
    rows: Omit<VariableEvaluationRecord, "id">[],
  ): Promise<VariableEvaluationRecord[]>;
  upsertInformationNeedStates(
    rows: Omit<InformationNeedStateRecord, "id">[],
  ): Promise<InformationNeedStateRecord[]>;
  listInformationNeedStates(assessmentId: string): Promise<InformationNeedStateRecord[]>;
}

/* ------------------------------------------------------------------ */
/* Implementación en memoria (pruebas / verificación del caso de uso)  */
/* ------------------------------------------------------------------ */

let contador = 0;
const nuevoId = (prefijo: string) => `${prefijo}-${String(++contador).padStart(6, "0")}`;

export function createInMemoryProductionRepository(
  assessments: AssessmentRecord[],
): ProductionRepository & { readonly estado: Readonly<Record<string, unknown[]>> } {
  const mapaAssessments = new Map(assessments.map((a) => [a.id, a]));
  const responses: ResponseRecord[] = [];
  const observations: ObservationRecord[] = [];
  const runs: EvaluationRunRecord[] = [];
  const variableEvaluations: VariableEvaluationRecord[] = [];
  const needStates: InformationNeedStateRecord[] = [];

  return {
    estado: { responses, observations, runs, variableEvaluations, needStates },

    async getAssessment(assessmentId) {
      return mapaAssessments.get(assessmentId) ?? null;
    },
    async insertResponse(input) {
      const row: ResponseRecord = { ...input, id: nuevoId("res"), createdAt: new Date().toISOString() };
      responses.push(row);
      return row;
    },
    async insertObservation(input) {
      const row: ObservationRecord = { ...input, id: nuevoId("obs"), createdAt: new Date().toISOString() };
      observations.push(row);
      return row;
    },
    async listObservations(assessmentId) {
      return observations.filter((o) => o.assessmentId === assessmentId);
    },
    async listResponses(assessmentId) {
      return responses.filter((r) => r.assessmentId === assessmentId);
    },
    async createEvaluationRun(input) {
      const row: EvaluationRunRecord = {
        ...input,
        id: nuevoId("run"),
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      runs.push(row);
      return row;
    },
    async completeEvaluationRun(runId, status, completedAt) {
      const row = runs.find((r) => r.id === runId);
      if (!row) throw new Error(`evaluation_run inexistente: ${runId}`);
      row.status = status;
      row.completedAt = completedAt;
      return row;
    },
    async replaceVariableEvaluations(runId, rows) {
      for (let i = variableEvaluations.length - 1; i >= 0; i -= 1) {
        if (variableEvaluations[i]!.evaluationRunId === runId) variableEvaluations.splice(i, 1);
      }
      const insertadas = rows.map((r) => ({ ...r, id: nuevoId("var") }));
      variableEvaluations.push(...insertadas);
      return insertadas;
    },
    async upsertInformationNeedStates(rows) {
      const resultado: InformationNeedStateRecord[] = [];
      for (const fila of rows) {
        const existente = needStates.find(
          (n) => n.assessmentId === fila.assessmentId && n.needRef === fila.needRef,
        );
        if (existente) {
          Object.assign(existente, fila);
          resultado.push(existente);
        } else {
          const nueva = { ...fila, id: nuevoId("nis") };
          needStates.push(nueva);
          resultado.push(nueva);
        }
      }
      return resultado;
    },
    async listInformationNeedStates(assessmentId) {
      return needStates.filter((n) => n.assessmentId === assessmentId);
    },
  };
}
