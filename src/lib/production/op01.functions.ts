/**
 * Application boundary del vertical OP-01 (M1-D).
 *
 * Funciones de servidor que el frontend consume a través de AssessmentClient.
 * Aquí NO hay conocimiento OP-01: el pack lo aporta y el engine lo interpreta,
 * ambos cargados dinámicamente dentro del handler para que el runtime server-only
 * nunca entre en el bundle del cliente.
 *
 * Dirección obligatoria:
 *   React → AssessmentClient → Application boundary → Knowledge Engine → PostgreSQL
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const estadoConocimiento = z.enum(["KNOWN", "UNKNOWN", "NOT_APPLICABLE", "CONTRADICTORY"]);

const submitSchema = z.object({
  acquisitionId: z.string().min(1),
  knowledgeState: estadoConocimiento,
  semanticValue: z.string().min(1).nullable().optional(),
  notApplicableReason: z.string().min(1).nullable().optional(),
  conflictingObservationIds: z.array(z.string()).optional(),
  rawInput: z.record(z.unknown()).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

const alcanceSchema = z.enum(["DOMAIN", "CAPABILITY", "INFORMATION_NEED", "SECTION"]);

const invitarSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).nullable().optional(),
  roleLabel: z.string().min(1).nullable().optional(),
  scopeType: alcanceSchema,
  scopeRef: z.string().min(1),
  delegatedFromAssignmentId: z.string().uuid().nullable().optional(),
  delegationReason: z.string().min(1).nullable().optional(),
});

const evidenciaSchema = z.object({
  candidateRef: z.string().min(1).nullable().optional(),
  evidenceType: z.string().min(1),
  source: z.enum(["HUMAN_RESPONDENT", "DOCUMENT", "SYSTEM_RECORD", "OBSERVED_EXECUTION"]),
  storageBucket: z.string().min(1).nullable().optional(),
  storagePath: z.string().min(1).nullable().optional(),
  externalReference: z.string().min(1).nullable().optional(),
  title: z.string().min(1).nullable().optional(),
  note: z.string().min(1).nullable().optional(),
  observationIds: z.array(z.string().uuid()).optional(),
});

/** Carga runtime + repositorio + assessment pinneado del usuario autenticado. */
async function prepararContexto(context: { userId: string; supabase: unknown }) {
  const runtime = await import("./runtime.server");
  const engine = runtime.cargarEngineOp01();
  const repository = runtime.createSupabaseProductionRepository();
  // El bootstrap tenant-owned se ejecuta con la identidad del usuario (RLS).
  type ClienteUsuario = Parameters<typeof runtime.asegurarContextoProductivo>[0];
  const assessment = await runtime.asegurarContextoProductivo(
    context.supabase as ClienteUsuario,
    context.userId,
  );
  return {
    assessment,
    deps: {
      engine,
      repository,
      knowledgeVersionId: assessment.knowledgeVersionId,
      hashToken: runtime.hashTokenInvitacion,
    },
  };
}

/**
 * Respondent propio del usuario autenticado, con asignación sobre la capacidad.
 * User ≠ Membership ≠ Respondent: esto no crea ni altera membresías.
 */
async function asegurarRespondentPropio(
  deps: Awaited<ReturnType<typeof prepararContexto>>["deps"],
  params: { organizationId: string; assessmentId: string; capabilityId: string; userId: string },
) {
  const casoUso = await import("./caso-uso");
  const respondent = await casoUso.asegurarRespondentDeUsuario(deps, {
    organizationId: params.organizationId,
    userId: params.userId,
  });
  const asignaciones = await deps.repository.listAssignments(params.assessmentId);
  const propia = asignaciones.find(
    (a) => a.respondentId === respondent.id && a.status !== "REVOKED",
  );
  if (propia) return { respondent, assignment: propia };
  const assignment = await deps.repository.insertAssignment({
    organizationId: params.organizationId,
    assessmentId: params.assessmentId,
    respondentId: respondent.id,
    scopeType: "CAPABILITY",
    scopeRef: params.capabilityId,
    status: "IN_PROGRESS",
    delegatedFromAssignmentId: null,
    delegationReason: null,
  });
  return { respondent, assignment };
}

/** Contexto productivo visible: Organization → Case → Assessment BASELINE. */
export const getOp01Context = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assessment } = await prepararContexto(context);
    return {
      userId: context.userId,
      organizationId: assessment.organizationId,
      caseId: assessment.caseId,
      assessmentId: assessment.id,
      assessmentType: assessment.type,
      knowledgeVersionId: assessment.knowledgeVersionId,
    };
  });

export const getOp01AssessmentState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context);
    const state = await casoUso.getAssessmentState(deps, assessment.id);
    return { assessmentId: assessment.id, state };
  });

export const getOp01NextAcquisition = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context);
    const acquisition = await casoUso.getNextAcquisition(deps, assessment.id);
    return { assessmentId: assessment.id, acquisition };
  });

export const submitOp01Response = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data, context }) => {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context);
    const { respondent } = await asegurarRespondentPropio(deps, {
      organizationId: assessment.organizationId,
      assessmentId: assessment.id,
      capabilityId: deps.engine.pack.capability.id,
      userId: context.userId,
    });
    return casoUso.submitAcquisitionResponse(deps, {
      assessmentId: assessment.id,
      organizationId: assessment.organizationId,
      submittedBy: context.userId,
      respondentId: respondent.id,
      acquisitionId: data.acquisitionId,
      knowledgeState: data.knowledgeState,
      semanticValue: data.semanticValue ?? null,
      notApplicableReason: data.notApplicableReason ?? null,
      ...(data.conflictingObservationIds
        ? { conflictingObservationIds: data.conflictingObservationIds }
        : {}),
      ...(data.rawInput ? { rawInput: data.rawInput } : {}),
      ...(data.evidenceIds ? { evidenceIds: data.evidenceIds } : {}),
    });
  });

/**
 * Contexto colaborativo del assessment: personas invitadas, alcances,
 * evidencias registradas y aclaraciones pendientes por contradicción.
 */
export const getOp01Collaboration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context);
    const [respondents, assignments, evidence, clarifications] = await Promise.all([
      deps.repository.listRespondents(assessment.organizationId),
      deps.repository.listAssignments(assessment.id),
      deps.repository.listEvidence(assessment.id),
      casoUso.getClarificationCandidates(deps, assessment.id),
    ]);
    const observations = await deps.repository.listObservations(assessment.id);
    return {
      assessmentId: assessment.id,
      capabilityId: deps.engine.pack.capability.id,
      // Nunca se expone el token de invitación, solo el estado del alcance.
      respondents: respondents.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        email: r.email,
        roleLabel: r.roleLabel,
        status: r.status,
        isSelf: r.userId === context.userId,
      })),
      assignments: assignments.map((a) => ({
        id: a.id,
        respondentId: a.respondentId,
        scopeType: a.scopeType,
        scopeRef: a.scopeRef,
        status: a.status,
        delegatedFromAssignmentId: a.delegatedFromAssignmentId,
        delegationReason: a.delegationReason,
      })),
      evidence: evidence.map((e) => ({
        id: e.id,
        candidateRef: e.candidateRef,
        evidenceType: e.evidenceType,
        source: e.source,
        title: e.title,
        createdAt: e.createdAt,
      })),
      evidenceCandidates: (deps.engine.pack.evidence?.candidates ?? []).map((c) => ({
        id: c.id,
        name: c.name,
      })),
      observations: observations.map((o) => ({
        id: o.id,
        variableRef: o.variableRef,
        acquisitionRef: o.value.acquisitionRef,
        knowledgeState: o.value.knowledgeState,
      })),
      clarificationCandidates: clarifications,
    };
  });

/** Invita o delega a otra persona dentro de un alcance concreto. */
export const inviteOp01Respondent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => invitarSchema.parse(data))
  .handler(async ({ data, context }) => {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context);
    // Token de un solo uso generado en el servidor; solo se persiste su hash.
    const token = crypto.randomUUID();
    const salida = await casoUso.invitarRespondent(deps, {
      organizationId: assessment.organizationId,
      assessmentId: assessment.id,
      email: data.email,
      displayName: data.displayName ?? null,
      roleLabel: data.roleLabel ?? null,
      scopeType: data.scopeType,
      scopeRef: data.scopeRef,
      createdBy: context.userId,
      token,
      delegatedFromAssignmentId: data.delegatedFromAssignmentId ?? null,
      delegationReason: data.delegationReason ?? null,
    });
    return {
      respondentId: salida.respondent.id,
      assignmentId: salida.assignment.id,
      invitationId: salida.invitation.id,
      status: salida.assignment.status,
    };
  });

/** Registra evidencia y la vincula a las observaciones que soporta. */
export const registerOp01Evidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => evidenciaSchema.parse(data))
  .handler(async ({ data, context }) => {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context);
    const { respondent } = await asegurarRespondentPropio(deps, {
      organizationId: assessment.organizationId,
      assessmentId: assessment.id,
      capabilityId: deps.engine.pack.capability.id,
      userId: context.userId,
    });
    const salida = await casoUso.registrarEvidencia(deps, {
      organizationId: assessment.organizationId,
      caseId: assessment.caseId,
      assessmentId: assessment.id,
      candidateRef: data.candidateRef ?? null,
      evidenceType: data.evidenceType,
      source: data.source,
      storageBucket: data.storageBucket ?? null,
      storagePath: data.storagePath ?? null,
      externalReference: data.externalReference ?? null,
      title: data.title ?? null,
      note: data.note ?? null,
      submittedBy: context.userId,
      respondentId: respondent.id,
      ...(data.observationIds ? { observationIds: data.observationIds } : {}),
    });
    return {
      evidenceId: salida.evidence.id,
      linkedObservationIds: salida.links.map((l) => l.observationId),
      evaluationRunId: salida.evaluationRunId,
      state: salida.state,
    };
  });
