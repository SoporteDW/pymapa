/**
 * Runtime productivo · SERVER ONLY (M1-D).
 *
 * Único lugar donde se cargan el Knowledge Pack y el Knowledge Engine, y el
 * único que habla con la base de datos. El frontend NO puede importar este
 * módulo (protección por sufijo `.server`) ni el engine.
 */
import { createHash } from "node:crypto";
import { createKnowledgeEngine, type KnowledgeEngine } from "@pymapa/knowledge-engine";
import packOp01 from "../../../knowledge/packs/op-01/1.0.0/pack.json" with { type: "json" };
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type {
  AssessmentRecord,
  AssignmentRecord,
  AssignmentStatus,
  EvaluationRunRecord,
  EvaluationRunStatus,
  EvidenceRecord,
  InformationNeedStateRecord,
  InvitationRecord,
  ObservationEvidenceLink,
  ObservationRecord,
  ProductionRepository,
  RespondentRecord,
  ResponseRecord,
  VariableEvaluationRecord,
  type FindingRecord,
  type FindingObservationLink,
  type FindingEvidenceLink,
  type DerivedDependencyReferenceRecord,
  type RecommendationCandidateRecord,
  type InterventionRecord,
  type ActivityRecord,
  type DeliverableRecord,
  type AuditEventRecord,
  type ExecutionState,
} from "./puertos";

/** Engine genérico ya enlazado al pack OP-01 1.0.0 (declarativo). */
export function cargarEngineOp01(): KnowledgeEngine {
  return createKnowledgeEngine(packOp01);
}

export function checksumPackOp01(): string {
  return createHash("sha256").update(JSON.stringify(packOp01)).digest("hex");
}

/** Hash del token de invitación. El token en claro nunca se persiste. */
export function hashTokenInvitacion(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const KNOWLEDGE_VERSION_IDENTIFIER = "PYMAPA-KNOWLEDGE-MASTER";
export const KNOWLEDGE_VERSION_NUMBER = "1.0.0";

/** Los campos jsonb del esquema aceptan objetos; el cast es solo de tipos. */
const aJson = (valor: unknown): Json => valor as Json;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function lanzar(contexto: string, error: { message: string } | null): void {
  if (error) throw new Error(`${contexto}: ${error.message}`);
}

/**
 * Registra (idempotente) la KnowledgeVersion gobernada que respalda el pack y
 * devuelve su id. Una versión PUBLISHED es inmutable: solo se lee o se crea.
 */
export async function asegurarKnowledgeVersion(): Promise<string> {
  const db = await admin();
  const checksum = checksumPackOp01();
  const existente = await db
    .from("knowledge_versions")
    .select("id, checksum")
    .eq("identifier", KNOWLEDGE_VERSION_IDENTIFIER)
    .eq("version", KNOWLEDGE_VERSION_NUMBER)
    .maybeSingle();
  lanzar("knowledge_versions.select", existente.error);
  if (existente.data) return existente.data.id;

  const creada = await db
    .from("knowledge_versions")
    .insert({
      identifier: KNOWLEDGE_VERSION_IDENTIFIER,
      version: KNOWLEDGE_VERSION_NUMBER,
      status: "PUBLISHED",
      checksum,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  lanzar("knowledge_versions.insert", creada.error);
  return creada.data!.id;
}

/* ------------------------------------------------------------------ */
/* Repositorio Supabase                                                */
/* ------------------------------------------------------------------ */

export function createSupabaseProductionRepository(): ProductionRepository {
  return {
    async getAssessment(assessmentId): Promise<AssessmentRecord | null> {
      const db = await admin();
      const { data, error } = await db
        .from("assessments")
        .select("id, organization_id, case_id, knowledge_version_id, type, started_at, closed_at, updated_at")
        .eq("id", assessmentId)
        .maybeSingle();
      lanzar("assessments.select", error);
      if (!data) return null;
      return {
        id: data.id,
        organizationId: data.organization_id,
        caseId: data.case_id,
        knowledgeVersionId: data.knowledge_version_id,
        type: data.type,
        startedAt: data.started_at,
        closedAt: data.closed_at,
        updatedAt: data.updated_at,
      };
    },

    async insertResponse(input): Promise<ResponseRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("responses")
        .insert({
          organization_id: input.organizationId,
          assessment_id: input.assessmentId,
          submitted_by: input.submittedBy,
          respondent_id: input.respondentId ?? null,
          acquisition_ref: input.acquisitionRef,
          payload: aJson(input.payload),
        })
        .select("id, created_at")
        .single();
      lanzar("responses.insert", error);
      return { ...input, id: data!.id, createdAt: data!.created_at };
    },

    async insertObservation(input): Promise<ObservationRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("observations")
        .insert({
          organization_id: input.organizationId,
          assessment_id: input.assessmentId,
          source_response_id: input.sourceResponseId,
          respondent_id: input.respondentId ?? null,
          variable_ref: input.variableRef,
          value: aJson(input.value),
        })
        .select("id, created_at")
        .single();
      lanzar("observations.insert", error);
      return { ...input, id: data!.id, createdAt: data!.created_at };
    },

    async listObservations(assessmentId): Promise<ObservationRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("observations")
        .select(
          "id, organization_id, assessment_id, source_response_id, respondent_id, variable_ref, value, created_at",
        )
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true });
      lanzar("observations.list", error);
      return (data ?? []).map((o) => ({
        id: o.id,
        organizationId: o.organization_id,
        assessmentId: o.assessment_id,
        sourceResponseId: o.source_response_id,
        respondentId: o.respondent_id,
        variableRef: o.variable_ref,
        value: o.value as ObservationRecord["value"],
        createdAt: o.created_at,
      }));
    },

    async listResponses(assessmentId): Promise<ResponseRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("responses")
        .select(
          "id, organization_id, assessment_id, submitted_by, respondent_id, acquisition_ref, payload, created_at",
        )
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true });
      lanzar("responses.list", error);
      return (data ?? []).map((r) => ({
        id: r.id,
        organizationId: r.organization_id,
        assessmentId: r.assessment_id,
        submittedBy: r.submitted_by,
        respondentId: r.respondent_id,
        acquisitionRef: r.acquisition_ref,
        payload: (r.payload ?? {}) as Record<string, unknown>,
        createdAt: r.created_at,
      }));
    },


    async createEvaluationRun(input): Promise<EvaluationRunRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("evaluation_runs")
        .insert({
          organization_id: input.organizationId,
          assessment_id: input.assessmentId,
          knowledge_version_id: input.knowledgeVersionId,
          engine_version: input.engineVersion,
          trigger: input.trigger,
          status: input.status,
          started_at: input.startedAt,
        })
        .select("id, created_at")
        .single();
      lanzar("evaluation_runs.insert", error);
      return { ...input, id: data!.id, completedAt: null, createdAt: data!.created_at };
    },

    async completeEvaluationRun(runId, status: EvaluationRunStatus, completedAt) {
      const db = await admin();
      const { data, error } = await db
        .from("evaluation_runs")
        .update({ status, completed_at: completedAt })
        .eq("id", runId)
        .select(
          "id, organization_id, assessment_id, knowledge_version_id, engine_version, trigger, status, started_at, completed_at, created_at",
        )
        .single();
      lanzar("evaluation_runs.update", error);
      return {
        id: data!.id,
        organizationId: data!.organization_id,
        assessmentId: data!.assessment_id,
        knowledgeVersionId: data!.knowledge_version_id,
        engineVersion: data!.engine_version,
        trigger: data!.trigger,
        status: data!.status,
        startedAt: data!.started_at,
        completedAt: data!.completed_at,
        createdAt: data!.created_at,
      };
    },

    async replaceVariableEvaluations(runId, rows): Promise<VariableEvaluationRecord[]> {
      const db = await admin();
      const borrado = await db.from("variable_evaluations").delete().eq("evaluation_run_id", runId);
      lanzar("variable_evaluations.delete", borrado.error);
      if (rows.length === 0) return [];
      const { data, error } = await db
        .from("variable_evaluations")
        .insert(
          rows.map((r) => ({
            organization_id: r.organizationId,
            evaluation_run_id: r.evaluationRunId,
            variable_ref: r.variableRef,
            state: r.state,
            detail: aJson(r.detail),
          })),
        )
        .select("id");
      lanzar("variable_evaluations.insert", error);
      return rows.map((r, i) => ({ ...r, id: data?.[i]?.id ?? "" }));
    },

    async upsertInformationNeedStates(rows): Promise<InformationNeedStateRecord[]> {
      const db = await admin();
      const resultado: InformationNeedStateRecord[] = [];
      for (const fila of rows) {
        const existente = await db
          .from("information_need_states")
          .select("id")
          .eq("assessment_id", fila.assessmentId)
          .eq("need_ref", fila.needRef)
          .maybeSingle();
        lanzar("information_need_states.select", existente.error);
        if (existente.data) {
          const act = await db
            .from("information_need_states")
            .update({
              state: fila.state,
              detail: aJson(fila.detail),
              evaluation_run_id: fila.evaluationRunId,
            })
            .eq("id", existente.data.id)
            .select("id")
            .single();
          lanzar("information_need_states.update", act.error);
          resultado.push({ ...fila, id: act.data!.id });
        } else {
          const ins = await db
            .from("information_need_states")
            .insert({
              organization_id: fila.organizationId,
              assessment_id: fila.assessmentId,
              evaluation_run_id: fila.evaluationRunId,
              need_ref: fila.needRef,
              state: fila.state,
              detail: aJson(fila.detail),
            })
            .select("id")
            .single();
          lanzar("information_need_states.insert", ins.error);
          resultado.push({ ...fila, id: ins.data!.id });
        }
      }
      return resultado;
    },

    async listInformationNeedStates(assessmentId): Promise<InformationNeedStateRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("information_need_states")
        .select("id, organization_id, assessment_id, evaluation_run_id, need_ref, state, detail")
        .eq("assessment_id", assessmentId);
      lanzar("information_need_states.list", error);
      return (data ?? []).map((n) => ({
        id: n.id,
        organizationId: n.organization_id,
        assessmentId: n.assessment_id,
        evaluationRunId: n.evaluation_run_id,
        needRef: n.need_ref,
        state: n.state,
        detail: (n.detail ?? null) as Record<string, unknown> | null,
      }));
    },

    /* ---------------- Diagnóstico colaborativo ---------------- */

    async insertRespondent(input): Promise<RespondentRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("respondents")
        .insert({
          organization_id: input.organizationId,
          user_id: input.userId,
          email: input.email,
          display_name: input.displayName,
          role_label: input.roleLabel,
          status: input.status,
        })
        .select("id, created_at")
        .single();
      lanzar("respondents.insert", error);
      return { ...input, id: data!.id, createdAt: data!.created_at };
    },

    async findRespondentByUserId(organizationId, userId): Promise<RespondentRecord | null> {
      const db = await admin();
      const { data, error } = await db
        .from("respondents")
        .select("id, organization_id, user_id, email, display_name, role_label, status, created_at")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();
      lanzar("respondents.byUser", error);
      return data ? mapRespondent(data) : null;
    },

    async findRespondentByEmail(organizationId, email): Promise<RespondentRecord | null> {
      const db = await admin();
      const { data, error } = await db
        .from("respondents")
        .select("id, organization_id, user_id, email, display_name, role_label, status, created_at")
        .eq("organization_id", organizationId)
        .ilike("email", email)
        .maybeSingle();
      lanzar("respondents.byEmail", error);
      return data ? mapRespondent(data) : null;
    },

    async getRespondent(respondentId): Promise<RespondentRecord | null> {
      const db = await admin();
      const { data, error } = await db
        .from("respondents")
        .select("id, organization_id, user_id, email, display_name, role_label, status, created_at")
        .eq("id", respondentId)
        .maybeSingle();
      lanzar("respondents.get", error);
      return data ? mapRespondent(data) : null;
    },

    async listRespondents(organizationId): Promise<RespondentRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("respondents")
        .select("id, organization_id, user_id, email, display_name, role_label, status, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });
      lanzar("respondents.list", error);
      return (data ?? []).map(mapRespondent);
    },

    async insertAssignment(input): Promise<AssignmentRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("assignments")
        .insert({
          organization_id: input.organizationId,
          assessment_id: input.assessmentId,
          respondent_id: input.respondentId,
          scope_type: input.scopeType,
          scope_ref: input.scopeRef,
          status: input.status,
          delegated_from_assignment_id: input.delegatedFromAssignmentId,
          delegation_reason: input.delegationReason,
        })
        .select("id, created_at")
        .single();
      lanzar("assignments.insert", error);
      return { ...input, id: data!.id, createdAt: data!.created_at };
    },

    async getAssignment(assignmentId): Promise<AssignmentRecord | null> {
      const db = await admin();
      const { data, error } = await db
        .from("assignments")
        .select(CAMPOS_ASSIGNMENT)
        .eq("id", assignmentId)
        .maybeSingle();
      lanzar("assignments.get", error);
      return data ? mapAssignment(data) : null;
    },

    async listAssignments(assessmentId): Promise<AssignmentRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("assignments")
        .select(CAMPOS_ASSIGNMENT)
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true });
      lanzar("assignments.list", error);
      return (data ?? []).map(mapAssignment);
    },

    async updateAssignmentStatus(assignmentId, status: AssignmentStatus): Promise<AssignmentRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("assignments")
        .update({ status })
        .eq("id", assignmentId)
        .select(CAMPOS_ASSIGNMENT)
        .single();
      lanzar("assignments.update", error);
      return mapAssignment(data!);
    },

    async insertInvitation(input): Promise<InvitationRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("invitations")
        .insert({
          organization_id: input.organizationId,
          respondent_id: input.respondentId,
          assignment_id: input.assignmentId,
          status: input.status,
          token_hash: input.tokenHash,
          expires_at: input.expiresAt,
        })
        .select("id, created_at")
        .single();
      lanzar("invitations.insert", error);
      return { ...input, id: data!.id, createdAt: data!.created_at };
    },

    async listInvitations(organizationId): Promise<InvitationRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("invitations")
        .select(
          "id, organization_id, respondent_id, assignment_id, status, token_hash, expires_at, created_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });
      lanzar("invitations.list", error);
      return (data ?? []).map((i) => ({
        id: i.id,
        organizationId: i.organization_id,
        respondentId: i.respondent_id,
        assignmentId: i.assignment_id,
        status: i.status,
        tokenHash: i.token_hash,
        expiresAt: i.expires_at,
        createdAt: i.created_at,
      }));
    },

    /* ---------------- Evidence Store ---------------- */

    async insertEvidence(input): Promise<EvidenceRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("evidence")
        .insert({
          organization_id: input.organizationId,
          case_id: input.caseId,
          assessment_id: input.assessmentId,
          candidate_ref: input.candidateRef,
          evidence_type: input.evidenceType,
          source: input.source,
          storage_bucket: input.storageBucket,
          storage_path: input.storagePath,
          external_reference: input.externalReference,
          title: input.title,
          note: input.note,
          submitted_by: input.submittedBy,
          respondent_id: input.respondentId,
          captured_at: input.capturedAt,
        })
        .select("id, created_at")
        .single();
      lanzar("evidence.insert", error);
      return { ...input, id: data!.id, createdAt: data!.created_at };
    },

    async listEvidence(assessmentId): Promise<EvidenceRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("evidence")
        .select(CAMPOS_EVIDENCE)
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true });
      lanzar("evidence.list", error);
      return (data ?? []).map(mapEvidence);
    },

    async linkEvidenceToObservation(input): Promise<ObservationEvidenceLink> {
      const db = await admin();
      const existente = await db
        .from("observation_evidence")
        .select("id, organization_id, observation_id, evidence_id, created_at")
        .eq("observation_id", input.observationId)
        .eq("evidence_id", input.evidenceId)
        .maybeSingle();
      lanzar("observation_evidence.select", existente.error);
      if (existente.data) {
        return {
          id: existente.data.id,
          organizationId: existente.data.organization_id,
          observationId: existente.data.observation_id,
          evidenceId: existente.data.evidence_id,
          createdAt: existente.data.created_at,
        };
      }
      const { data, error } = await db
        .from("observation_evidence")
        .insert({
          organization_id: input.organizationId,
          observation_id: input.observationId,
          evidence_id: input.evidenceId,
        })
        .select("id, created_at")
        .single();
      lanzar("observation_evidence.insert", error);
      return { ...input, id: data!.id, createdAt: data!.created_at };
    },

    async listEvidenceLinks(assessmentId): Promise<ObservationEvidenceLink[]> {
      const db = await admin();
      const observaciones = await db
        .from("observations")
        .select("id")
        .eq("assessment_id", assessmentId);
      lanzar("observations.idsForLinks", observaciones.error);
      const ids = (observaciones.data ?? []).map((o) => o.id);
      if (ids.length === 0) return [];
      const { data, error } = await db
        .from("observation_evidence")
        .select("id, organization_id, observation_id, evidence_id, created_at")
        .in("observation_id", ids);
      lanzar("observation_evidence.list", error);
      return (data ?? []).map((l) => ({
        id: l.id,
        organizationId: l.organization_id,
        observationId: l.observation_id,
        evidenceId: l.evidence_id,
        createdAt: l.created_at,
      }));
    },

    /* ---------------- Findings y preparación de ejecución -------------- */

    async insertFinding(input): Promise<FindingRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("findings")
        .insert({
          organization_id: input.organizationId,
          case_id: input.caseId,
          assessment_id: input.assessmentId,
          evaluation_run_id: input.evaluationRunId,
          knowledge_version_id: input.knowledgeVersionId,
          capability_id: input.capabilityId,
          finding_ref: input.findingRef,
          polarity: input.polarity,
          lifecycle_state: input.lifecycleState,
          severity_qualitative: input.severityQualitative,
          severity_reason: input.severityReason,
          knowledge_pack_id: input.knowledgePackId,
          knowledge_pack_version: input.knowledgePackVersion,
          engine_version: input.engineVersion,
          rule_refs: input.ruleRefs,
          variable_refs: input.variableRefs,
          detail: aJson(input.detail ?? {}),
        })
        .select("id, organization_id, case_id, assessment_id, evaluation_run_id, knowledge_version_id, capability_id, finding_ref, polarity, lifecycle_state, severity_qualitative, severity_reason, knowledge_pack_id, knowledge_pack_version, engine_version, rule_refs, variable_refs, detail, superseded_by_finding_id, reviewed_by, reviewed_at, created_at")
        .single();
      lanzar("findings.insert", error);
      return aFinding(data!);
    },

    async getFinding(findingId): Promise<FindingRecord | null> {
      const db = await admin();
      const { data, error } = await db.from("findings").select("id, organization_id, case_id, assessment_id, evaluation_run_id, knowledge_version_id, capability_id, finding_ref, polarity, lifecycle_state, severity_qualitative, severity_reason, knowledge_pack_id, knowledge_pack_version, engine_version, rule_refs, variable_refs, detail, superseded_by_finding_id, reviewed_by, reviewed_at, created_at").eq("id", findingId).maybeSingle();
      lanzar("findings.get", error);
      return data ? aFinding(data) : null;
    },

    async listFindings(assessmentId): Promise<FindingRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("findings")
        .select("id, organization_id, case_id, assessment_id, evaluation_run_id, knowledge_version_id, capability_id, finding_ref, polarity, lifecycle_state, severity_qualitative, severity_reason, knowledge_pack_id, knowledge_pack_version, engine_version, rule_refs, variable_refs, detail, superseded_by_finding_id, reviewed_by, reviewed_at, created_at")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true });
      lanzar("findings.list", error);
      return (data ?? []).map(aFinding);
    },

    async updateFinding(findingId, patch): Promise<FindingRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("findings")
        .update({
          ...(patch.lifecycleState !== undefined ? { lifecycle_state: patch.lifecycleState } : {}),
          ...(patch.severityQualitative !== undefined ? { severity_qualitative: patch.severityQualitative } : {}),
          ...(patch.severityReason !== undefined ? { severity_reason: patch.severityReason } : {}),
          ...(patch.supersededByFindingId !== undefined
            ? { superseded_by_finding_id: patch.supersededByFindingId }
            : {}),
          ...(patch.reviewedBy !== undefined ? { reviewed_by: patch.reviewedBy } : {}),
          ...(patch.reviewedAt !== undefined ? { reviewed_at: patch.reviewedAt } : {}),
        })
        .eq("id", findingId)
        .select("id, organization_id, case_id, assessment_id, evaluation_run_id, knowledge_version_id, capability_id, finding_ref, polarity, lifecycle_state, severity_qualitative, severity_reason, knowledge_pack_id, knowledge_pack_version, engine_version, rule_refs, variable_refs, detail, superseded_by_finding_id, reviewed_by, reviewed_at, created_at")
        .single();
      lanzar("findings.update", error);
      return aFinding(data!);
    },

    async linkFindingObservation(input): Promise<FindingObservationLink> {
      const db = await admin();
      const existente = await db
        .from("finding_observations")
        .select("id, organization_id, finding_id, observation_id")
        .eq("finding_id", input.findingId)
        .eq("observation_id", input.observationId)
        .maybeSingle();
      lanzar("finding_observations.select", existente.error);
      if (existente.data) {
        return {
          id: existente.data.id,
          organizationId: existente.data.organization_id,
          findingId: existente.data.finding_id,
          observationId: existente.data.observation_id,
        };
      }
      const { data, error } = await db
        .from("finding_observations")
        .insert({
          organization_id: input.organizationId,
          finding_id: input.findingId,
          observation_id: input.observationId,
        })
        .select("id")
        .single();
      lanzar("finding_observations.insert", error);
      return { ...input, id: data!.id };
    },

    async linkFindingEvidence(input): Promise<FindingEvidenceLink> {
      const db = await admin();
      const existente = await db
        .from("finding_evidence")
        .select("id, organization_id, finding_id, evidence_id")
        .eq("finding_id", input.findingId)
        .eq("evidence_id", input.evidenceId)
        .maybeSingle();
      lanzar("finding_evidence.select", existente.error);
      if (existente.data) {
        return {
          id: existente.data.id,
          organizationId: existente.data.organization_id,
          findingId: existente.data.finding_id,
          evidenceId: existente.data.evidence_id,
        };
      }
      const { data, error } = await db
        .from("finding_evidence")
        .insert({
          organization_id: input.organizationId,
          finding_id: input.findingId,
          evidence_id: input.evidenceId,
        })
        .select("id")
        .single();
      lanzar("finding_evidence.insert", error);
      return { ...input, id: data!.id };
    },

    async listFindingObservationLinks(findingId): Promise<FindingObservationLink[]> {
      const db = await admin();
      const { data, error } = await db
        .from("finding_observations")
        .select("id, organization_id, finding_id, observation_id")
        .eq("finding_id", findingId);
      lanzar("finding_observations.list", error);
      return (data ?? []).map((l) => ({
        id: l.id,
        organizationId: l.organization_id,
        findingId: l.finding_id,
        observationId: l.observation_id,
      }));
    },

    async listFindingEvidenceLinks(findingId): Promise<FindingEvidenceLink[]> {
      const db = await admin();
      const { data, error } = await db
        .from("finding_evidence")
        .select("id, organization_id, finding_id, evidence_id")
        .eq("finding_id", findingId);
      lanzar("finding_evidence.list", error);
      return (data ?? []).map((l) => ({
        id: l.id,
        organizationId: l.organization_id,
        findingId: l.finding_id,
        evidenceId: l.evidence_id,
      }));
    },

    async insertDerivedDependencyReference(input): Promise<DerivedDependencyReferenceRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("derived_dependency_references")
        .insert({
          organization_id: input.organizationId,
          assessment_id: input.assessmentId,
          finding_id: input.findingId,
          cause: input.cause,
          source_capability_id: input.sourceCapabilityId,
          target_capability_id: input.targetCapabilityId,
          target_domain_id: input.targetDomainId,
          // Invariante: una referencia derivada nunca es ejecutable.
          executable: false,
          note: input.note,
        })
        .select("id, organization_id, assessment_id, finding_id, cause, source_capability_id, target_capability_id, target_domain_id, executable, note, created_at")
        .single();
      lanzar("derived_dependency_references.insert", error);
      return aDependencia(data!);
    },

    async listDerivedDependencyReferences(assessmentId): Promise<DerivedDependencyReferenceRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("derived_dependency_references")
        .select("id, organization_id, assessment_id, finding_id, cause, source_capability_id, target_capability_id, target_domain_id, executable, note, created_at")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true });
      lanzar("derived_dependency_references.list", error);
      return (data ?? []).map(aDependencia);
    },

    async insertRecommendationCandidate(input): Promise<RecommendationCandidateRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("recommendation_candidates")
        .insert({
          organization_id: input.organizationId,
          case_id: input.caseId,
          assessment_id: input.assessmentId,
          finding_id: input.findingId,
          recommendation_ref: input.recommendationRef,
          content_status: input.contentStatus,
          mapping_status: input.mappingStatus,
          title: input.title,
          status: input.status,
          detail: aJson(input.detail ?? {}),
        })
        .select("id, organization_id, case_id, assessment_id, finding_id, recommendation_ref, content_status, mapping_status, title, status, decided_by, decided_at, decision_note, detail, created_at")
        .single();
      lanzar("recommendation_candidates.insert", error);
      return aRecomendacion(data!);
    },

    async getRecommendationCandidate(id): Promise<RecommendationCandidateRecord | null> {
      const db = await admin();
      const { data, error } = await db
        .from("recommendation_candidates")
        .select("id, organization_id, case_id, assessment_id, finding_id, recommendation_ref, content_status, mapping_status, title, status, decided_by, decided_at, decision_note, detail, created_at")
        .eq("id", id)
        .maybeSingle();
      lanzar("recommendation_candidates.get", error);
      return data ? aRecomendacion(data) : null;
    },

    async listRecommendationCandidates(assessmentId): Promise<RecommendationCandidateRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("recommendation_candidates")
        .select("id, organization_id, case_id, assessment_id, finding_id, recommendation_ref, content_status, mapping_status, title, status, decided_by, decided_at, decision_note, detail, created_at")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true });
      lanzar("recommendation_candidates.list", error);
      return (data ?? []).map(aRecomendacion);
    },

    async updateRecommendationCandidate(id, patch): Promise<RecommendationCandidateRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("recommendation_candidates")
        .update({
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.decidedBy !== undefined ? { decided_by: patch.decidedBy } : {}),
          ...(patch.decidedAt !== undefined ? { decided_at: patch.decidedAt } : {}),
          ...(patch.decisionNote !== undefined ? { decision_note: patch.decisionNote } : {}),
        })
        .eq("id", id)
        .select("id, organization_id, case_id, assessment_id, finding_id, recommendation_ref, content_status, mapping_status, title, status, decided_by, decided_at, decision_note, detail, created_at")
        .single();
      lanzar("recommendation_candidates.update", error);
      return aRecomendacion(data!);
    },

    async insertIntervention(input): Promise<InterventionRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("interventions")
        .insert({
          organization_id: input.organizationId,
          case_id: input.caseId,
          assessment_id: input.assessmentId,
          recommendation_candidate_id: input.recommendationCandidateId,
          finding_id: input.findingId,
          title: input.title,
          status: input.status,
          selection_note: input.selectionNote,
          accepted_by: input.acceptedBy,
          accepted_at: input.acceptedAt,
        })
        .select("id, organization_id, case_id, assessment_id, recommendation_candidate_id, finding_id, title, status, selection_note, accepted_by, accepted_at, created_at")
        .single();
      lanzar("interventions.insert", error);
      return aIntervencion(data!);
    },

    async getIntervention(id): Promise<InterventionRecord | null> {
      const db = await admin();
      const { data, error } = await db.from("interventions").select("id, organization_id, case_id, assessment_id, recommendation_candidate_id, finding_id, title, status, selection_note, accepted_by, accepted_at, created_at").eq("id", id).maybeSingle();
      lanzar("interventions.get", error);
      return data ? aIntervencion(data) : null;
    },

    async listInterventions(assessmentId): Promise<InterventionRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("interventions")
        .select("id, organization_id, case_id, assessment_id, recommendation_candidate_id, finding_id, title, status, selection_note, accepted_by, accepted_at, created_at")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true });
      lanzar("interventions.list", error);
      return (data ?? []).map(aIntervencion);
    },

    async insertActivity(input): Promise<ActivityRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("activities")
        .insert({
          organization_id: input.organizationId,
          intervention_id: input.interventionId,
          activity_ref: input.activityRef,
          content_status: input.contentStatus,
          mapping_status: input.mappingStatus,
          title: input.title,
          state: input.state,
        })
        .select("id, organization_id, intervention_id, activity_ref, content_status, mapping_status, title, state, created_at")
        .single();
      lanzar("activities.insert", error);
      return aActividad(data!);
    },

    async getActivity(id): Promise<ActivityRecord | null> {
      const db = await admin();
      const { data, error } = await db.from("activities").select("id, organization_id, intervention_id, activity_ref, content_status, mapping_status, title, state, created_at").eq("id", id).maybeSingle();
      lanzar("activities.get", error);
      return data ? aActividad(data) : null;
    },

    async listActivities(interventionId): Promise<ActivityRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("activities")
        .select("id, organization_id, intervention_id, activity_ref, content_status, mapping_status, title, state, created_at")
        .eq("intervention_id", interventionId)
        .order("created_at", { ascending: true });
      lanzar("activities.list", error);
      return (data ?? []).map(aActividad);
    },

    async updateActivityState(id, state: ExecutionState): Promise<ActivityRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("activities")
        .update({ state })
        .eq("id", id)
        .select("id, organization_id, intervention_id, activity_ref, content_status, mapping_status, title, state, created_at")
        .single();
      lanzar("activities.updateState", error);
      return aActividad(data!);
    },

    async insertDeliverable(input): Promise<DeliverableRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("deliverables")
        .insert({
          organization_id: input.organizationId,
          activity_id: input.activityId,
          evidence_id: input.evidenceId,
          title: input.title,
          note: input.note,
          registered_by: input.registeredBy,
          registered_at: input.registeredAt,
        })
        .select("id, organization_id, activity_id, evidence_id, title, note, registered_by, registered_at, created_at")
        .single();
      lanzar("deliverables.insert", error);
      return aEntregable(data!);
    },

    async listDeliverables(activityId): Promise<DeliverableRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("deliverables")
        .select("id, organization_id, activity_id, evidence_id, title, note, registered_by, registered_at, created_at")
        .eq("activity_id", activityId)
        .order("created_at", { ascending: true });
      lanzar("deliverables.list", error);
      return (data ?? []).map(aEntregable);
    },

    async insertAuditEvent(input): Promise<AuditEventRecord> {
      const db = await admin();
      const { data, error } = await db
        .from("audit_events")
        .insert({
          organization_id: input.organizationId,
          assessment_id: input.assessmentId,
          event_type: input.eventType,
          subject_table: input.subjectTable,
          subject_id: input.subjectId,
          actor_user_id: input.actorUserId,
          detail: aJson(input.detail ?? {}),
        })
        .select("id, organization_id, assessment_id, event_type, subject_table, subject_id, actor_user_id, detail, created_at")
        .single();
      lanzar("audit_events.insert", error);
      return aAuditoria(data!);
    },

    async listAuditEvents(organizationId): Promise<AuditEventRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("audit_events")
        .select("id, organization_id, assessment_id, event_type, subject_table, subject_id, actor_user_id, detail, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      lanzar("audit_events.list", error);
      return (data ?? []).map(aAuditoria);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Mapeos snake_case → camelCase                                       */
/* ------------------------------------------------------------------ */

type FilaFinding = {
  id: string;
  organization_id: string;
  case_id: string;
  assessment_id: string;
  evaluation_run_id: string;
  knowledge_version_id: string;
  capability_id: string;
  finding_ref: string;
  polarity: FindingRecord["polarity"];
  lifecycle_state: FindingRecord["lifecycleState"];
  severity_qualitative: string | null;
  severity_reason: string;
  knowledge_pack_id: string;
  knowledge_pack_version: string;
  engine_version: string;
  rule_refs: string[] | null;
  variable_refs: string[] | null;
  detail: unknown;
  superseded_by_finding_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function aFinding(f: FilaFinding): FindingRecord {
  return {
    id: f.id,
    organizationId: f.organization_id,
    caseId: f.case_id,
    assessmentId: f.assessment_id,
    evaluationRunId: f.evaluation_run_id,
    knowledgeVersionId: f.knowledge_version_id,
    capabilityId: f.capability_id,
    findingRef: f.finding_ref,
    polarity: f.polarity,
    lifecycleState: f.lifecycle_state,
    severityQualitative: f.severity_qualitative,
    severityReason: f.severity_reason,
    knowledgePackId: f.knowledge_pack_id,
    knowledgePackVersion: f.knowledge_pack_version,
    engineVersion: f.engine_version,
    ruleRefs: f.rule_refs ?? [],
    variableRefs: f.variable_refs ?? [],
    detail: (f.detail as Record<string, unknown> | null) ?? null,
    supersededByFindingId: f.superseded_by_finding_id,
    reviewedBy: f.reviewed_by,
    reviewedAt: f.reviewed_at,
    createdAt: f.created_at,
  };
}

function aDependencia(d: {
  id: string;
  organization_id: string;
  assessment_id: string;
  finding_id: string | null;
  cause: string;
  source_capability_id: string;
  target_capability_id: string | null;
  target_domain_id: string | null;
  executable: boolean;
  note: string | null;
  created_at: string;
}): DerivedDependencyReferenceRecord {
  return {
    id: d.id,
    organizationId: d.organization_id,
    assessmentId: d.assessment_id,
    findingId: d.finding_id,
    cause: d.cause,
    sourceCapabilityId: d.source_capability_id,
    targetCapabilityId: d.target_capability_id,
    targetDomainId: d.target_domain_id,
    executable: false,
    note: d.note,
    createdAt: d.created_at,
  };
}

function aRecomendacion(r: {
  id: string;
  organization_id: string;
  case_id: string;
  assessment_id: string;
  finding_id: string | null;
  recommendation_ref: string;
  content_status: string;
  mapping_status: string;
  title: string | null;
  status: RecommendationCandidateRecord["status"];
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  detail: unknown;
  created_at: string;
}): RecommendationCandidateRecord {
  return {
    id: r.id,
    organizationId: r.organization_id,
    caseId: r.case_id,
    assessmentId: r.assessment_id,
    findingId: r.finding_id,
    recommendationRef: r.recommendation_ref,
    contentStatus: r.content_status,
    mappingStatus: r.mapping_status,
    title: r.title,
    status: r.status,
    decidedBy: r.decided_by,
    decidedAt: r.decided_at,
    decisionNote: r.decision_note,
    detail: (r.detail as Record<string, unknown> | null) ?? null,
    createdAt: r.created_at,
  };
}

function aIntervencion(i: {
  id: string;
  organization_id: string;
  case_id: string;
  assessment_id: string;
  recommendation_candidate_id: string | null;
  finding_id: string | null;
  title: string;
  status: InterventionRecord["status"];
  selection_note: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}): InterventionRecord {
  return {
    id: i.id,
    organizationId: i.organization_id,
    caseId: i.case_id,
    assessmentId: i.assessment_id,
    recommendationCandidateId: i.recommendation_candidate_id,
    findingId: i.finding_id,
    title: i.title,
    status: i.status,
    selectionNote: i.selection_note,
    acceptedBy: i.accepted_by,
    acceptedAt: i.accepted_at,
    createdAt: i.created_at,
  };
}

function aActividad(a: {
  id: string;
  organization_id: string;
  intervention_id: string;
  activity_ref: string | null;
  content_status: string;
  mapping_status: string;
  title: string;
  state: ExecutionState;
  created_at: string;
}): ActivityRecord {
  return {
    id: a.id,
    organizationId: a.organization_id,
    interventionId: a.intervention_id,
    activityRef: a.activity_ref,
    contentStatus: a.content_status,
    mappingStatus: a.mapping_status,
    title: a.title,
    state: a.state,
    createdAt: a.created_at,
  };
}

function aEntregable(d: {
  id: string;
  organization_id: string;
  activity_id: string;
  evidence_id: string | null;
  title: string;
  note: string | null;
  registered_by: string | null;
  registered_at: string;
  created_at: string;
}): DeliverableRecord {
  return {
    id: d.id,
    organizationId: d.organization_id,
    activityId: d.activity_id,
    evidenceId: d.evidence_id,
    title: d.title,
    note: d.note,
    registeredBy: d.registered_by,
    registeredAt: d.registered_at,
    createdAt: d.created_at,
  };
}

function aAuditoria(a: {
  id: string;
  organization_id: string;
  assessment_id: string | null;
  event_type: AuditEventRecord["eventType"];
  subject_table: string;
  subject_id: string | null;
  actor_user_id: string | null;
  detail: unknown;
  created_at: string;
}): AuditEventRecord {
  return {
    id: a.id,
    organizationId: a.organization_id,
    assessmentId: a.assessment_id,
    eventType: a.event_type,
    subjectTable: a.subject_table,
    subjectId: a.subject_id,
    actorUserId: a.actor_user_id,
    detail: (a.detail as Record<string, unknown> | null) ?? null,
    createdAt: a.created_at,
  };
}

const CAMPOS_ASSIGNMENT =
  "id, organization_id, assessment_id, respondent_id, scope_type, scope_ref, status, delegated_from_assignment_id, delegation_reason, created_at";

const CAMPOS_EVIDENCE =
  "id, organization_id, case_id, assessment_id, candidate_ref, evidence_type, source, storage_bucket, storage_path, external_reference, title, note, submitted_by, respondent_id, captured_at, created_at";

function mapRespondent(row: {
  id: string;
  organization_id: string;
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  role_label: string | null;
  status: RespondentRecord["status"];
  created_at: string;
}): RespondentRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    roleLabel: row.role_label,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapAssignment(row: {
  id: string;
  organization_id: string;
  assessment_id: string;
  respondent_id: string;
  scope_type: AssignmentRecord["scopeType"];
  scope_ref: string;
  status: AssignmentStatus;
  delegated_from_assignment_id: string | null;
  delegation_reason: string | null;
  created_at: string;
}): AssignmentRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    assessmentId: row.assessment_id,
    respondentId: row.respondent_id,
    scopeType: row.scope_type,
    scopeRef: row.scope_ref,
    status: row.status,
    delegatedFromAssignmentId: row.delegated_from_assignment_id,
    delegationReason: row.delegation_reason,
    createdAt: row.created_at,
  };
}

function mapEvidence(row: {
  id: string;
  organization_id: string;
  case_id: string;
  assessment_id: string;
  candidate_ref: string | null;
  evidence_type: string;
  source: EvidenceRecord["source"];
  storage_bucket: string | null;
  storage_path: string | null;
  external_reference: string | null;
  title: string | null;
  note: string | null;
  submitted_by: string | null;
  respondent_id: string | null;
  captured_at: string | null;
  created_at: string;
}): EvidenceRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    caseId: row.case_id,
    assessmentId: row.assessment_id,
    candidateRef: row.candidate_ref,
    evidenceType: row.evidence_type,
    source: row.source,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    externalReference: row.external_reference,
    title: row.title,
    note: row.note,
    submittedBy: row.submitted_by,
    respondentId: row.respondent_id,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
  };
}

/* ------------------------------------------------------------------ */
/* Bootstrap del vertical (M1-D2)                                      */
/* ------------------------------------------------------------------ */

/**
 * Cliente Supabase con la identidad del usuario autenticado (RLS activa).
 * El bootstrap tenant-owned SIEMPRE usa este cliente: nunca el service role.
 */
export type ClienteUsuario = SupabaseClient<Database>;

/**
 * Resuelve (o crea) Organization → Membership → Case → Assessment BASELINE del
 * usuario autenticado, ejecutando toda operación tenant-owned bajo RLS con su
 * propia identidad. La única parte privilegiada es el registro de la
 * KnowledgeVersion gobernada (knowledge_versions es solo-lectura para clientes).
 */
export async function asegurarContextoProductivo(
  db: ClienteUsuario,
  userId: string,
): Promise<AssessmentRecord> {
  const knowledgeVersionId = await asegurarKnowledgeVersion();

  // 1. Organization + Membership vía función gobernada (SECURITY DEFINER):
  //    crea la organización del usuario y su membresía OWNER, o devuelve la
  //    existente. No permite operar sobre organizaciones de terceros.
  const bootstrap = await db.rpc("bootstrap_organization", {
    _name: "Organización de trabajo",
  });
  lanzar("bootstrap_organization", bootstrap.error);
  const organizationId = bootstrap.data as string | null;
  if (!organizationId) throw new Error("bootstrap_organization: sin organización");

  // 2. Membership verificada con la identidad del usuario (RLS).
  const membresia = await db
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  lanzar("memberships.select", membresia.error);
  if (!membresia.data) throw new Error("MEMBERSHIP_REQUIRED");

  // 3. Case de transformación de largo plazo.
  const caso = await db
    .from("cases")
    .select("id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  lanzar("cases.select", caso.error);

  let caseId = caso.data?.id ?? null;
  if (!caseId) {
    const creado = await db
      .from("cases")
      .insert({ organization_id: organizationId, name: "Caso de transformación" })
      .select("id")
      .single();
    lanzar("cases.insert", creado.error);
    caseId = creado.data!.id;
  }

  // 4. Assessment BASELINE pinneado a la KnowledgeVersion publicada.
  const existente = await db
    .from("assessments")
    .select("id, organization_id, case_id, knowledge_version_id, type, started_at, closed_at, updated_at")
    .eq("case_id", caseId)
    .eq("knowledge_version_id", knowledgeVersionId)
    .eq("type", "BASELINE")
    .limit(1)
    .maybeSingle();
  lanzar("assessments.select", existente.error);

  const fila =
    existente.data ??
    (await (async () => {
      const creado = await db
        .from("assessments")
        .insert({
          organization_id: organizationId,
          case_id: caseId,
          knowledge_version_id: knowledgeVersionId,
          type: "BASELINE",
          started_at: new Date().toISOString(),
        })
        .select(
          "id, organization_id, case_id, knowledge_version_id, type, started_at, closed_at, updated_at",
        )
        .single();
      lanzar("assessments.insert", creado.error);
      return creado.data!;
    })());

  return {
    id: fila.id,
    organizationId: fila.organization_id,
    caseId: fila.case_id,
    knowledgeVersionId: fila.knowledge_version_id,
    type: fila.type,
    startedAt: fila.started_at,
    closedAt: fila.closed_at,
    updatedAt: fila.updated_at,
  };
}
