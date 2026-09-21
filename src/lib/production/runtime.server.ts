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
import type { Json } from "@/integrations/supabase/types";
import type {
  AssessmentRecord,
  EvaluationRunRecord,
  EvaluationRunStatus,
  InformationNeedStateRecord,
  ObservationRecord,
  ProductionRepository,
  ResponseRecord,
  VariableEvaluationRecord,
} from "./puertos";

/** Engine genérico ya enlazado al pack OP-01 1.0.0 (declarativo). */
export function cargarEngineOp01(): KnowledgeEngine {
  return createKnowledgeEngine(packOp01);
}

export function checksumPackOp01(): string {
  return createHash("sha256").update(JSON.stringify(packOp01)).digest("hex");
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
        .select("id, organization_id, assessment_id, source_response_id, variable_ref, value, created_at")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true });
      lanzar("observations.list", error);
      return (data ?? []).map((o) => ({
        id: o.id,
        organizationId: o.organization_id,
        assessmentId: o.assessment_id,
        sourceResponseId: o.source_response_id,
        variableRef: o.variable_ref,
        value: o.value as ObservationRecord["value"],
        createdAt: o.created_at,
      }));
    },

    async listResponses(assessmentId): Promise<ResponseRecord[]> {
      const db = await admin();
      const { data, error } = await db
        .from("responses")
        .select("id, organization_id, assessment_id, submitted_by, acquisition_ref, payload, created_at")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true });
      lanzar("responses.list", error);
      return (data ?? []).map((r) => ({
        id: r.id,
        organizationId: r.organization_id,
        assessmentId: r.assessment_id,
        submittedBy: r.submitted_by,
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
