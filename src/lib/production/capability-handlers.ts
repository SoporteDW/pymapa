/**
 * PKG-01 · Handlers genéricos del application boundary (capabilityId-parametrizados).
 * Origen: vertical OP-01 (M1-D). Sin conocimiento por capacidad.
 *
 * Funciones de servidor que el frontend consume a través de AssessmentClient.
 * Aquí NO hay conocimiento OP-01: el pack lo aporta y el engine lo interpreta,
 * ambos cargados dinámicamente dentro del handler para que el runtime server-only
 * nunca entre en el bundle del cliente.
 *
 * Dirección obligatoria:
 *   React → AssessmentClient → Application boundary → Knowledge Engine → PostgreSQL
 */
import { z } from "zod";

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

export type Ctx = { userId: string; supabase: unknown };

/** Carga runtime + repositorio + assessment pinneado del usuario autenticado. */
async function prepararContexto(context: Ctx, capabilityId: string) {
  const runtime = await import("./runtime.server");
  // Falla cerrado ante capacidades no publicadas (registro genérico).
  const engine = runtime.cargarEngine(capabilityId);
  const { packChecksum } = runtime.identidadPack(capabilityId);
  const repository = runtime.createSupabaseProductionRepository();
  // El bootstrap tenant-owned se ejecuta con la identidad del usuario (RLS).
  type ClienteUsuario = Parameters<typeof runtime.asegurarContextoProductivo>[0];
  const assessment = await runtime.asegurarContextoProductivo(
    context.supabase as ClienteUsuario,
    context.userId,
    capabilityId,
  );
  return {
    assessment,
    deps: {
      engine,
      repository,
      knowledgeVersionId: assessment.knowledgeVersionId,
      hashToken: runtime.hashTokenInvitacion,
      packChecksum,
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
export async function getCapabilityContextHandler(context: Ctx, capabilityId: string, _data: Record<string, never>) {
    const { assessment } = await prepararContexto(context, capabilityId);
    return {
      userId: context.userId,
      organizationId: assessment.organizationId,
      caseId: assessment.caseId,
      assessmentId: assessment.id,
      assessmentType: assessment.type,
      knowledgeVersionId: assessment.knowledgeVersionId,
    };
}

export async function getCapabilityAssessmentStateHandler(context: Ctx, capabilityId: string, _data: Record<string, never>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    const state = await casoUso.getAssessmentState(deps, assessment.id);
    return { assessmentId: assessment.id, state };
}

export async function getCapabilityNextAcquisitionHandler(context: Ctx, capabilityId: string, _data: Record<string, never>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    const acquisition = await casoUso.getNextAcquisition(deps, assessment.id);
    return { assessmentId: assessment.id, acquisition };
}

export const submitCapabilityResponseInput = (data: unknown) => submitSchema.parse(data);

export async function submitCapabilityResponseHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof submitCapabilityResponseInput>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
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
}

/**
 * Contexto colaborativo del assessment: personas invitadas, alcances,
 * evidencias registradas y aclaraciones pendientes por contradicción.
 */
export async function getCapabilityCollaborationHandler(context: Ctx, capabilityId: string, _data: Record<string, never>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
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
}

/** Invita o delega a otra persona dentro de un alcance concreto. */
export const inviteCapabilityRespondentInput = (data: unknown) => invitarSchema.parse(data);

export async function inviteCapabilityRespondentHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof inviteCapabilityRespondentInput>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
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
}

/** Registra evidencia y la vincula a las observaciones que soporta. */
export const registerCapabilityEvidenceInput = (data: unknown) => evidenciaSchema.parse(data);

export async function registerCapabilityEvidenceHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof registerCapabilityEvidenceInput>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
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
}

/* ------------------------------------------------------------------ */
/* Findings, recomendaciones y preparación de ejecución (M1-HIJ)        */
/* ------------------------------------------------------------------ */

const revisionSchema = z.object({
  findingId: z.string().uuid(),
  decision: z.enum(["NEEDS_REVIEW", "CONFIRMED", "DISMISSED"]),
  /** Cualitativa. No existe severidad numérica gobernada. */
  severityQualitative: z.string().min(1).nullable().optional(),
  note: z.string().min(1).nullable().optional(),
});

const recomendacionSchema = z.object({
  recommendationRef: z.string().min(1),
  findingId: z.string().uuid().nullable().optional(),
});

const decisionRecomendacionSchema = z.object({
  recommendationCandidateId: z.string().uuid(),
  decision: z.enum(["SELECTED", "REJECTED"]),
  note: z.string().min(1).nullable().optional(),
});

const intervencionSchema = z.object({
  title: z.string().min(1),
  recommendationCandidateId: z.string().uuid().nullable().optional(),
  findingId: z.string().uuid().nullable().optional(),
  selectionNote: z.string().min(1).nullable().optional(),
});

const actividadSchema = z.object({
  interventionId: z.string().uuid(),
  title: z.string().min(1),
  activityRef: z.string().min(1).nullable().optional(),
});

const estadoActividadSchema = z.object({
  activityId: z.string().uuid(),
  state: z.enum(["PENDING", "EXECUTING", "DELIVERABLE_PRODUCED"]),
});

const entregableSchema = z.object({
  activityId: z.string().uuid(),
  title: z.string().min(1),
  note: z.string().min(1).nullable().optional(),
  evidenceId: z.string().uuid().nullable().optional(),
});

/**
 * Estado productivo de findings y preparación de ejecución.
 * No expone severidad numérica ni prioridad: no existen en el conocimiento.
 */
export async function getCapabilityFindingsHandler(context: Ctx, capabilityId: string, _data: Record<string, never>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    const [findings, dependencies, recommendations, interventions, auditEvents, pendientes] = await Promise.all([
      casoUso.listFindings(deps, assessment.id),
      casoUso.listDerivedDependencyReferences(deps, assessment.id),
      casoUso.listRecommendationCandidates(deps, assessment.id),
      casoUso.listInterventions(deps, assessment.id),
      deps.repository.listAuditEvents(assessment.organizationId),
      casoUso.listFindingsAwaitingResolution(deps, assessment.id),
    ]);

    const conActividades = await Promise.all(
      interventions.map(async (i) => {
        const activities = await casoUso.listActivities(deps, i.id);
        const conEntregables = await Promise.all(
          activities.map(async (a) => ({
            id: a.id,
            activityRef: a.activityRef,
            title: a.title,
            state: a.state,
            contentStatus: a.contentStatus,
            mappingStatus: a.mappingStatus,
            deliverables: (await casoUso.listDeliverables(deps, a.id)).map((d) => ({
              id: d.id,
              title: d.title,
              note: d.note,
              registeredAt: d.registeredAt,
            })),
          })),
        );
        return {
          id: i.id,
          title: i.title,
          status: i.status,
          recommendationCandidateId: i.recommendationCandidateId,
          findingId: i.findingId,
          selectionNote: i.selectionNote,
          activities: conEntregables,
        };
      }),
    );

    return {
      assessmentId: assessment.id,
      findings: findings.map((f) => ({
        id: f.id,
        findingRef: f.findingRef,
        name: (f.detail?.["name"] as string | undefined) ?? f.findingRef,
        reason: (f.detail?.["reason"] as string | undefined) ?? null,
        polarity: f.polarity,
        lifecycleState: f.lifecycleState,
        severityQualitative: f.severityQualitative,
        severityReason: f.severityReason,
        ruleRefs: f.ruleRefs,
        variableRefs: f.variableRefs,
        supersededByFindingId: f.supersededByFindingId,
        reviewedAt: f.reviewedAt,
        lineage: {
          assessmentId: f.assessmentId,
          capabilityId: f.capabilityId,
          knowledgeVersionId: f.knowledgeVersionId,
          knowledgePackId: f.knowledgePackId,
          knowledgePackVersion: f.knowledgePackVersion,
          engineVersion: f.engineVersion,
          evaluationRunId: f.evaluationRunId,
        },
        createdAt: f.createdAt,
      })),
      // Persistidos por EvaluationRun; separados de findings: nunca son Findings.
      findingsAwaitingResolution: {
        evaluationRunId: pendientes.evaluationRunId,
        items: pendientes.items.map((f) => ({
          findingRef: f.findingRef,
          status: f.status,
          unresolvedStates: f.unresolvedStates,
          variableStates: f.variableStates,
          observationIds: f.observationIds,
          evidenceIds: f.evidenceIds,
          resolutionRequirement: f.resolutionRequirement,
          resolutionAcquisitionRefs: f.resolutionAcquisitionRefs,
          reason: f.reason,
          evaluationRunId: f.evaluationRunId,
          knowledgeVersionId: f.knowledgeVersionId,
        })),
      },
      derivedDependencyReferences: dependencies.map((d) => ({
        id: d.id,
        cause: d.cause,
        sourceCapabilityId: d.sourceCapabilityId,
        targetCapabilityId: d.targetCapabilityId,
        targetDomainId: d.targetDomainId,
        executable: d.executable,
        note: d.note,
      })),
      recommendationIdentities: deps.engine.getRecommendationCandidates().map((r) => ({
        recommendationRef: r.recommendationRef,
        title: r.title,
        contentStatus: r.contentStatus,
        mappingStatus: r.mappingStatus,
        automatable: r.automatable,
      })),
      recommendationCandidates: recommendations.map((r) => ({
        id: r.id,
        recommendationRef: r.recommendationRef,
        title: r.title,
        contentStatus: r.contentStatus,
        mappingStatus: r.mappingStatus,
        status: r.status,
        findingId: r.findingId,
        decisionNote: r.decisionNote,
      })),
      activityIdentities: deps.engine.listActivityIdentities(),
      interventionPrinciple: deps.engine.getInterventionPrinciple(),
      interventions: conActividades,
      auditEvents: auditEvents.slice(0, 50).map((a) => ({
        id: a.id,
        eventType: a.eventType,
        subjectTable: a.subjectTable,
        subjectId: a.subjectId,
        createdAt: a.createdAt,
      })),
    };
}

/** Revisión humana del finding: la única vía para CONFIRMED o DISMISSED. */
export const reviewCapabilityFindingInput = (data: unknown) => revisionSchema.parse(data);

export async function reviewCapabilityFindingHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof reviewCapabilityFindingInput>) {
    const casoUso = await import("./caso-uso");
    const { deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.revisarFinding(deps, {
      findingId: data.findingId,
      decision: data.decision,
      reviewedBy: context.userId,
      ...(data.severityQualitative !== undefined
        ? { severityQualitative: data.severityQualitative }
        : {}),
      note: data.note ?? null,
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      lifecycleState: salida.finding?.lifecycleState ?? null,
    };
}

/** Registra un RecommendationCandidate: nunca se genera automáticamente. */
export const createCapabilityRecommendationCandidateInput = (data: unknown) => recomendacionSchema.parse(data);

export async function createCapabilityRecommendationCandidateHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof createCapabilityRecommendationCandidateInput>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.registrarRecommendationCandidate(deps, {
      assessmentId: assessment.id,
      organizationId: assessment.organizationId,
      recommendationRef: data.recommendationRef,
      findingId: data.findingId ?? null,
      createdBy: context.userId,
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      recommendationCandidateId: salida.candidate?.id ?? null,
    };
}

export const decideCapabilityRecommendationInput = (data: unknown) => decisionRecomendacionSchema.parse(data);

export async function decideCapabilityRecommendationHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof decideCapabilityRecommendationInput>) {
    const casoUso = await import("./caso-uso");
    const { deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.decidirRecommendationCandidate(deps, {
      recommendationCandidateId: data.recommendationCandidateId,
      decision: data.decision,
      decidedBy: context.userId,
      note: data.note ?? null,
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      status: salida.candidate?.status ?? null,
    };
}

/** Intervention: objeto distinto del RecommendationCandidate. */
export const createCapabilityInterventionInput = (data: unknown) => intervencionSchema.parse(data);

export async function createCapabilityInterventionHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof createCapabilityInterventionInput>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.crearIntervencion(deps, {
      assessmentId: assessment.id,
      organizationId: assessment.organizationId,
      title: data.title,
      recommendationCandidateId: data.recommendationCandidateId ?? null,
      findingId: data.findingId ?? null,
      selectionNote: data.selectionNote ?? null,
      createdBy: context.userId,
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      interventionId: salida.intervention?.id ?? null,
    };
}

export const createCapabilityActivityInput = (data: unknown) => actividadSchema.parse(data);

export async function createCapabilityActivityHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof createCapabilityActivityInput>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.crearActividad(deps, {
      interventionId: data.interventionId,
      organizationId: assessment.organizationId,
      title: data.title,
      activityRef: data.activityRef ?? null,
      createdBy: context.userId,
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      activityId: salida.activity?.id ?? null,
    };
}

export const changeCapabilityActivityStateInput = (data: unknown) => estadoActividadSchema.parse(data);

export async function changeCapabilityActivityStateHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof changeCapabilityActivityStateInput>) {
    const casoUso = await import("./caso-uso");
    const { deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.cambiarEstadoActividad(deps, {
      activityId: data.activityId,
      state: data.state,
      actorUserId: context.userId,
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      state: salida.activity?.state ?? null,
    };
}

/** Registrar un entregable NO valida la actividad: CRV pertenece a M1-KL. */
export const registerCapabilityDeliverableInput = (data: unknown) => entregableSchema.parse(data);

export async function registerCapabilityDeliverableHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof registerCapabilityDeliverableInput>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.registrarEntregable(deps, {
      activityId: data.activityId,
      organizationId: assessment.organizationId,
      title: data.title,
      note: data.note ?? null,
      evidenceId: data.evidenceId ?? null,
      registeredBy: context.userId,
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      deliverableId: salida.deliverable?.id ?? null,
      activityState: salida.activity?.state ?? null,
      validated: false,
    };
}

/* ================================================================== */
/* M1-KL · CRV · Validation · Follow-up · Reassessment                 */
/* ================================================================== */

/** Los payloads del boundary son serializables: `detail` queda server-side. */
function sinDetalle<T extends { detail?: unknown }>(row: T | null) {
  if (!row) return null;
  const { detail: _detalle, ...resto } = row;
  return resto;
}

const idSchema = z.string().uuid();

const requisitoSchema = z.object({
  activityId: idSchema,
  primaryExecutorRespondentId: idSchema.nullable().optional(),
});

const casoCrvSchema = z.object({
  validationRequirementId: idSchema,
  executorRespondentId: idSchema,
  outcome: z.enum(["CORRECT", "INCORRECT"]),
  criticalAssistance: z.boolean(),
  evidenceId: idSchema.nullable().optional(),
  note: z.string().min(1).nullable().optional(),
});

const decisionValidacionSchema = z.object({
  validationId: idSchema,
  decision: z.enum(["PENDING", "IN_REVIEW", "VALIDATED", "NOT_VALIDATED", "INSUFFICIENT_EVIDENCE"]),
  reason: z.string().min(1).nullable().optional(),
  evidenceIds: z.array(idSchema).optional(),
});

const followUpSchema = z.object({
  followUpId: idSchema,
  outcome: z.enum(["CONSOLIDATED", "NEEDS_ADJUSTMENT"]),
  note: z.string().min(1).nullable().optional(),
  evidenceId: idSchema.nullable().optional(),
});

/** Done explícito: producir un entregable no marca Done ni valida nada. */
export const markCapabilityActivityDoneInput = (data: unknown) => z.object({ activityId: idSchema }).parse(data);

export async function markCapabilityActivityDoneHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof markCapabilityActivityDoneInput>) {
    const casoUso = await import("./caso-uso");
    const { deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.marcarActividadDone(deps, {
      activityId: data.activityId,
      actorUserId: context.userId,
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      activityState: salida.activity?.state ?? null,
      doneAt: salida.activity?.doneAt ?? null,
      validated: false,
    };
}

export const registerCapabilityValidationRequirementInput = (data: unknown) => requisitoSchema.parse(data);

export async function registerCapabilityValidationRequirementHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof registerCapabilityValidationRequirementInput>) {
    const casoUso = await import("./caso-uso");
    const { deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.registrarRequisitoValidacion(deps, {
      activityId: data.activityId,
      primaryExecutorRespondentId: data.primaryExecutorRespondentId ?? null,
      createdBy: context.userId,
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      requirement: sinDetalle(salida.requirement),
    };
}

export const registerCapabilityValidationCaseInput = (data: unknown) => casoCrvSchema.parse(data);

export async function registerCapabilityValidationCaseHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof registerCapabilityValidationCaseInput>) {
    const casoUso = await import("./caso-uso");
    const { deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.registrarCasoValidacion(deps, {
      validationRequirementId: data.validationRequirementId,
      executorRespondentId: data.executorRespondentId,
      outcome: data.outcome,
      criticalAssistance: data.criticalAssistance,
      evidenceId: data.evidenceId ?? null,
      note: data.note ?? null,
      registeredBy: context.userId,
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      sequenceIndex: salida.case?.sequenceIndex ?? null,
      evaluation: salida.evaluation,
    };
}

export const openCapabilityValidationInput = (data: unknown) =>
    z.object({ activityId: idSchema, evidenceIds: z.array(idSchema).optional() }).parse(data);

export async function openCapabilityValidationHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof openCapabilityValidationInput>) {
    const casoUso = await import("./caso-uso");
    const { deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.abrirValidacion(deps, {
      activityId: data.activityId,
      actorUserId: context.userId,
      ...(data.evidenceIds ? { evidenceIds: data.evidenceIds } : {}),
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      validation: sinDetalle(salida.validation),
      evaluation: salida.evaluation,
    };
}

export const decideCapabilityValidationInput = (data: unknown) => decisionValidacionSchema.parse(data);

export async function decideCapabilityValidationHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof decideCapabilityValidationInput>) {
    const casoUso = await import("./caso-uso");
    const { deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.decidirValidacion(deps, {
      validationId: data.validationId,
      decision: data.decision,
      reason: data.reason ?? null,
      reviewedBy: context.userId,
      ...(data.evidenceIds ? { evidenceIds: data.evidenceIds } : {}),
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      validation: sinDetalle(salida.validation),
    };
}

export const startCapabilityFollowUpInput = (data: unknown) =>
    z.object({ validationId: idSchema, note: z.string().min(1).nullable().optional() }).parse(data);

export async function startCapabilityFollowUpHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof startCapabilityFollowUpInput>) {
    const casoUso = await import("./caso-uso");
    const { deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.iniciarFollowUp(deps, {
      validationId: data.validationId,
      actorUserId: context.userId,
      note: data.note ?? null,
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      followUp: salida.followUp,
    };
}

export const decideCapabilityFollowUpInput = (data: unknown) => followUpSchema.parse(data);

export async function decideCapabilityFollowUpHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof decideCapabilityFollowUpInput>) {
    const casoUso = await import("./caso-uso");
    const { deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.decidirFollowUp(deps, {
      followUpId: data.followUpId,
      outcome: data.outcome,
      note: data.note ?? null,
      evidenceId: data.evidenceId ?? null,
      decidedBy: context.userId,
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      followUp: salida.followUp,
    };
}

/** Reassessment: nuevo Assessment del mismo Case, sin tocar el Baseline. */
export const startCapabilityReassessmentInput = (data: unknown) =>
    z.object({ knowledgeVersionId: idSchema.optional() }).parse(data ?? {});

export async function startCapabilityReassessmentHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof startCapabilityReassessmentInput>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.iniciarReassessment(deps, {
      baselineAssessmentId: assessment.id,
      actorUserId: context.userId,
      ...(data.knowledgeVersionId ? { knowledgeVersionId: data.knowledgeVersionId } : {}),
    });
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      baselineAssessmentId: assessment.id,
      reassessmentAssessmentId: salida.assessment?.id ?? null,
      reassessmentKnowledgeVersionId: salida.assessment?.knowledgeVersionId ?? null,
      evaluationRunId: salida.evaluationRunId,
      snapshotId: salida.snapshot?.id ?? null,
    };
}

export const compareCapabilityAssessmentsInput = (data: unknown) =>
    z
      .object({ baselineAssessmentId: idSchema, reassessmentAssessmentId: idSchema })
      .parse(data);

export async function compareCapabilityAssessmentsHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof compareCapabilityAssessmentsInput>) {
    const casoUso = await import("./caso-uso");
    const { deps } = await prepararContexto(context, capabilityId);
    const salida = await casoUso.compararAssessments(deps, data);
    return {
      accepted: salida.accepted,
      rejectionReason: salida.rejectionReason ?? null,
      comparison: salida.comparison,
    };
}

/** Estado de validación y seguimiento del assessment activo. */
export async function getCapabilityValidationHandler(context: Ctx, capabilityId: string, _data: Record<string, never>) {
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    const interventions = await deps.repository.listInterventions(assessment.id);
    const requirements = (
      await Promise.all(interventions.map((i) => deps.repository.listValidationRequirements(i.id)))
    ).flat();
    const validations = await deps.repository.listValidations(assessment.id);
    const followUps = (
      await Promise.all(validations.map((v) => deps.repository.listFollowUps(v.activityId ?? "")))
    ).flat();
    const assessments = await deps.repository.listAssessments(assessment.caseId);
    return {
      assessmentId: assessment.id,
      requirements: requirements.map((r) => sinDetalle(r)!),
      validations: validations.map((v) => sinDetalle(v)!),
      followUps,
      assessments: assessments.map((a) => ({
        id: a.id,
        type: a.type,
        knowledgeVersionId: a.knowledgeVersionId,
        startedAt: a.startedAt,
      })),
    };
}
