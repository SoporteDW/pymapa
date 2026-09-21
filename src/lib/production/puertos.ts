/**
 * Puertos de persistencia del vertical productivo (M1-D · ampliado en M1-EFG).
 *
 * Define la frontera entre el caso de uso y el almacenamiento. No contiene
 * SQL, ni cliente Supabase, ni conocimiento de ninguna capacidad: el pack
 * gobierna el contenido y el engine la evaluación.
 *
 * Lineage estricto: Response ≠ Evidence ≠ Observation ≠ Evaluation.
 * Identidades separadas: User ≠ Membership ≠ Respondent.
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
  /** Fuente humana declarada; puede no ser miembro de la organización. */
  respondentId?: string | null;
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
  /** Fuente humana que la originó, cuando se conoce. */
  respondentId?: string | null;
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

/* ------------------------------------------------------------------ */
/* Diagnóstico colaborativo                                            */
/* ------------------------------------------------------------------ */

export type RespondentStatus = "INVITED" | "ACTIVE" | "REVOKED";

export interface RespondentRecord {
  id: string;
  organizationId: string;
  /** null cuando la persona aún no tiene cuenta: Respondent ≠ User. */
  userId: string | null;
  email: string | null;
  displayName: string | null;
  roleLabel: string | null;
  status: RespondentStatus;
  createdAt: string;
}

export type AssignmentScopeType = "DOMAIN" | "CAPABILITY" | "INFORMATION_NEED" | "SECTION";

export type AssignmentStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELEGATED"
  | "REVOKED";

export interface AssignmentRecord {
  id: string;
  organizationId: string;
  assessmentId: string;
  respondentId: string;
  scopeType: AssignmentScopeType;
  /** Referencia gobernada del alcance: capacidad, necesidad, dominio o sección. */
  scopeRef: string;
  status: AssignmentStatus;
  delegatedFromAssignmentId: string | null;
  delegationReason: string | null;
  createdAt: string;
}

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface InvitationRecord {
  id: string;
  organizationId: string;
  respondentId: string;
  assignmentId: string | null;
  status: InvitationStatus;
  /** Solo el hash del token: el token en claro nunca se persiste. */
  tokenHash: string;
  expiresAt: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Evidence Store                                                      */
/* ------------------------------------------------------------------ */

export type EvidenceSource =
  | "HUMAN_RESPONDENT"
  | "DOCUMENT"
  | "SYSTEM_RECORD"
  | "OBSERVED_EXECUTION";

export interface EvidenceRecord {
  id: string;
  organizationId: string;
  caseId: string;
  assessmentId: string;
  /** Candidato gobernado del pack (p. ej. OP01-EV01) o null. */
  candidateRef: string | null;
  evidenceType: string;
  source: EvidenceSource;
  /** Referencia a storage; los archivos nunca se guardan en la base de datos. */
  storageBucket: string | null;
  storagePath: string | null;
  externalReference: string | null;
  title: string | null;
  note: string | null;
  submittedBy: string | null;
  respondentId: string | null;
  capturedAt: string | null;
  createdAt: string;
}

/** Vínculo Evidence ↔ Observation. Una evidencia puede soportar varias. */
export interface ObservationEvidenceLink {
  id: string;
  organizationId: string;
  observationId: string;
  evidenceId: string;
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

  /* Colaborativo */
  insertRespondent(input: Omit<RespondentRecord, "id" | "createdAt">): Promise<RespondentRecord>;
  findRespondentByUserId(organizationId: string, userId: string): Promise<RespondentRecord | null>;
  findRespondentByEmail(organizationId: string, email: string): Promise<RespondentRecord | null>;
  getRespondent(respondentId: string): Promise<RespondentRecord | null>;
  listRespondents(organizationId: string): Promise<RespondentRecord[]>;
  insertAssignment(input: Omit<AssignmentRecord, "id" | "createdAt">): Promise<AssignmentRecord>;
  getAssignment(assignmentId: string): Promise<AssignmentRecord | null>;
  listAssignments(assessmentId: string): Promise<AssignmentRecord[]>;
  updateAssignmentStatus(assignmentId: string, status: AssignmentStatus): Promise<AssignmentRecord>;
  insertInvitation(input: Omit<InvitationRecord, "id" | "createdAt">): Promise<InvitationRecord>;
  listInvitations(organizationId: string): Promise<InvitationRecord[]>;

  /* Evidence Store */
  insertEvidence(input: Omit<EvidenceRecord, "id" | "createdAt">): Promise<EvidenceRecord>;
  listEvidence(assessmentId: string): Promise<EvidenceRecord[]>;
  linkEvidenceToObservation(
    input: Omit<ObservationEvidenceLink, "id" | "createdAt">,
  ): Promise<ObservationEvidenceLink>;
  listEvidenceLinks(assessmentId: string): Promise<ObservationEvidenceLink[]>;
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
  const respondents: RespondentRecord[] = [];
  const assignments: AssignmentRecord[] = [];
  const invitations: InvitationRecord[] = [];
  const evidence: EvidenceRecord[] = [];
  const evidenceLinks: ObservationEvidenceLink[] = [];

  const assessmentIdsDe = (organizationOrAssessment: string) => organizationOrAssessment;

  return {
    estado: {
      responses,
      observations,
      runs,
      variableEvaluations,
      needStates,
      respondents,
      assignments,
      invitations,
      evidence,
      evidenceLinks,
    },

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

    /* Colaborativo */
    async insertRespondent(input) {
      const row: RespondentRecord = { ...input, id: nuevoId("rsp"), createdAt: new Date().toISOString() };
      respondents.push(row);
      return row;
    },
    async findRespondentByUserId(organizationId, userId) {
      return (
        respondents.find((r) => r.organizationId === organizationId && r.userId === userId) ?? null
      );
    },
    async findRespondentByEmail(organizationId, email) {
      return (
        respondents.find(
          (r) =>
            r.organizationId === organizationId &&
            (r.email ?? "").toLowerCase() === email.toLowerCase(),
        ) ?? null
      );
    },
    async getRespondent(respondentId) {
      return respondents.find((r) => r.id === respondentId) ?? null;
    },
    async listRespondents(organizationId) {
      return respondents.filter((r) => r.organizationId === organizationId);
    },
    async insertAssignment(input) {
      const row: AssignmentRecord = { ...input, id: nuevoId("asg"), createdAt: new Date().toISOString() };
      assignments.push(row);
      return row;
    },
    async getAssignment(assignmentId) {
      return assignments.find((a) => a.id === assignmentId) ?? null;
    },
    async listAssignments(assessmentId) {
      return assignments.filter((a) => a.assessmentId === assessmentIdsDe(assessmentId));
    },
    async updateAssignmentStatus(assignmentId, status) {
      const row = assignments.find((a) => a.id === assignmentId);
      if (!row) throw new Error(`assignment inexistente: ${assignmentId}`);
      row.status = status;
      return row;
    },
    async insertInvitation(input) {
      const row: InvitationRecord = { ...input, id: nuevoId("inv"), createdAt: new Date().toISOString() };
      invitations.push(row);
      return row;
    },
    async listInvitations(organizationId) {
      return invitations.filter((i) => i.organizationId === organizationId);
    },

    /* Evidence Store */
    async insertEvidence(input) {
      const row: EvidenceRecord = { ...input, id: nuevoId("evi"), createdAt: new Date().toISOString() };
      evidence.push(row);
      return row;
    },
    async listEvidence(assessmentId) {
      return evidence.filter((e) => e.assessmentId === assessmentId);
    },
    async linkEvidenceToObservation(input) {
      const existente = evidenceLinks.find(
        (l) => l.observationId === input.observationId && l.evidenceId === input.evidenceId,
      );
      if (existente) return existente;
      const row: ObservationEvidenceLink = {
        ...input,
        id: nuevoId("oev"),
        createdAt: new Date().toISOString(),
      };
      evidenceLinks.push(row);
      return row;
    },
    async listEvidenceLinks(assessmentId) {
      const ids = new Set(observations.filter((o) => o.assessmentId === assessmentId).map((o) => o.id));
      return evidenceLinks.filter((l) => ids.has(l.observationId));
    },
  };
}
