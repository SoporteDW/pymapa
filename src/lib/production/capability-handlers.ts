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
  correctsObservationId: z.string().uuid().nullable().optional(),
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
async function prepararContexto(
  context: Ctx,
  capabilityId: string,
  opciones: {
    baseRepository?: import("./puertos").ProductionRepository;
    /** UX-PROD-FIX-02 · Resolución memoizada del Assessment (hub). */
    resolverAssessment?: (capabilityId: string) => Promise<import("./puertos").AssessmentRecord>;
  } = {},
) {
  const runtime = await import("./runtime.server");
  const { scopeRepositoryToCapability } = await import("./capability-scope");
  // Falla cerrado ante capacidades no publicadas (registro genérico).
  const engine = runtime.cargarEngine(capabilityId);
  const { packChecksum } = runtime.identidadPack(capabilityId);
  // PKG-02: el Assessment del runtime manifest es compartido por las 31
  // capacidades; el repositorio se aísla por capacidad (ids de pack se repiten).
  const baseRepository = opciones.baseRepository ?? runtime.createSupabaseProductionRepository();
  const repository = scopeRepositoryToCapability(baseRepository, engine.pack.capability.id);
  // El bootstrap tenant-owned se ejecuta con la identidad del usuario (RLS).
  type ClienteUsuario = Parameters<typeof runtime.asegurarContextoProductivo>[0];
  const assessment = opciones.resolverAssessment
    ? await opciones.resolverAssessment(capabilityId)
    : await runtime.asegurarContextoProductivo(
        context.supabase as ClienteUsuario,
        context.userId,
        capabilityId,
      );
  return {
    assessment,
    baseRepository,
    deps: {
      engine,
      repository,
      knowledgeVersionId: assessment.knowledgeVersionId,
      hashToken: runtime.hashTokenInvitacion,
      packChecksum,
    },
  };
}

/** Roles de membresía que participan en todas las capacidades sin invitación. */
const ROLES_CON_PARTICIPACION_PLENA = new Set(["OWNER", "ADMIN"]);

/**
 * Respondent propio del usuario autenticado, con asignación que autoriza la
 * capacidad (y la adquisición, si se indica).
 * User ≠ Membership ≠ Respondent: esto no crea ni altera membresías.
 *
 * SPRINT-04-FIX · Nunca reutiliza una asignación que no cubra la petición.
 * OWNER/ADMIN reciben una asignación CAPABILITY auditable por capacidad la
 * primera vez que participan; los demás (p. ej. respondents delegados)
 * conservan exactamente el alcance que se les asignó.
 */
export async function asegurarRespondentPropio(
  deps: Awaited<ReturnType<typeof prepararContexto>>["deps"],
  params: {
    organizationId: string;
    assessmentId: string;
    capabilityId: string;
    userId: string;
    acquisitionId?: string;
  },
) {
  const casoUso = await import("./caso-uso");
  const capability = deps.engine.pack.capability;
  if (capability.id !== params.capabilityId) throw new Error("CAPABILITY_MISMATCH");
  const respondent = await casoUso.asegurarRespondentDeUsuario(deps, {
    organizationId: params.organizationId,
    userId: params.userId,
  });
  const acquisition = params.acquisitionId ? deps.engine.getAcquisition(params.acquisitionId) : null;
  const asignaciones = (await deps.repository.listAssignments(params.assessmentId)).filter(
    (a) =>
      a.respondentId === respondent.id &&
      a.assessmentId === params.assessmentId &&
      a.status !== "REVOKED",
  );
  const valida = asignaciones.find((a) =>
    acquisition
      ? casoUso.assignmentCubreAdquisicion(
          a,
          {
            id: acquisition.id,
            ...(acquisition.informationNeedRef ? { informationNeedRef: acquisition.informationNeedRef } : {}),
            variableRefs: acquisition.variableRefs,
          },
          capability,
        )
      : casoUso.assignmentPerteneceACapacidad(a, capability),
  );
  if (valida) return { respondent, assignment: valida };

  const rol = await deps.repository.getMembershipRole(params.organizationId, params.userId);
  if (!rol || !ROLES_CON_PARTICIPACION_PLENA.has(rol)) {
    // Sin asignación válida: el caso de uso rechazará con el motivo gobernado.
    return { respondent, assignment: null };
  }
  const assignment = await deps.repository.insertAssignment({
    organizationId: params.organizationId,
    assessmentId: params.assessmentId,
    respondentId: respondent.id,
    scopeType: "CAPABILITY",
    scopeRef: capability.id,
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

export const reuseCapabilityDocumentInput = (data: unknown) => z.object({
  sourceMappingId: z.string().uuid(),
  targetType: z.enum(["ACQUISITION", "INFORMATION_NEED", "VARIABLE", "EVIDENCE_CRITERION"]),
  targetRef: z.string().min(1),
}).strict().parse(data);

export async function reuseCapabilityDocumentHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof reuseCapabilityDocumentInput>) {
  const runtime = await import("./runtime.server");
  type Client = Parameters<typeof runtime.asegurarContextoProductivo>[0];
  const client = context.supabase as Client;
  const assessment = await runtime.asegurarContextoProductivo(client, context.userId, capabilityId);
  // Authorization through the authenticated client BEFORE accessing the privileged repository.
  const { data: membership, error: roleError } = await client.from("memberships").select("role")
    .eq("organization_id", assessment.organizationId).eq("user_id", context.userId).maybeSingle();
  if (roleError || !membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) throw new Error("DOCUMENT_REUSE_FORBIDDEN");
  const { data: source, error: sourceError } = await client.from("fragment_mappings").select("id")
    .eq("id", data.sourceMappingId).eq("organization_id", assessment.organizationId)
    .eq("assessment_id", assessment.id).maybeSingle();
  if (sourceError || !source) throw new Error("SOURCE_MAPPING_NOT_IN_ORGANIZATION");
  const engine = runtime.cargarEngine(capabilityId);
  const { reutilizarEvidenciaDocumental } = await import("./cross-capability-evidence");
  const mapping = await reutilizarEvidenciaDocumental({
    repository: runtime.createSupabaseProductionRepository(), knowledgeVersionId: assessment.knowledgeVersionId,
    packId: engine.pack.packId, packVersion: engine.pack.packVersion,
    catalog: {
      capabilityId: engine.pack.capability.id,
       acquisitions: engine.listAcquisitions().map((a) => ({ id: a.id, variableRefs: a.variableRefs,
         ...(a.acquisitionMode ? { acquisitionMode: a.acquisitionMode } : {}) })), variableIds: engine.pack.variables.map((v) => v.id),
      informationNeedIds: (engine.pack.informationNeeds ?? []).map((n) => n.id),
      evidenceCriterionIds: (engine.pack.conditionsOfExistence ?? []).map((c) => c.id),
    },
  }, { ...data, organizationId: assessment.organizationId, assessmentId: assessment.id, actorUserId: context.userId });
  return { mappingId: mapping.id, status: mapping.status, evidenceId: mapping.evidenceId,
    fragmentId: mapping.fragmentId, capabilityId: mapping.capabilityId };
}

/* ------------------------------------------------------------------ */
/* INT-01-R1 · Admisión y revocación documental gobernadas              */
/* ------------------------------------------------------------------ */

/** Solo OWNER/ADMIN pueden admitir o revocar correspondencias documentales. */
export function assertDocumentGovernanceRole(rol: string | null): void {
  if (!rol || !ROLES_CON_PARTICIPACION_PLENA.has(rol)) {
    throw new Error("DOCUMENT_GOVERNANCE_FORBIDDEN");
  }
}

/**
 * R1 · Punto de integración efectivo del DocumentAdmissionBridge: procesa las
 * correspondencias documentales del Assessment de esta capacidad. Admite las
 * VALIDATED con correspondencia factual gobernada (observación física que el
 * Engine evalúa) e invalida append-only las de mappings SUPERSEDED.
 * Autorización: OWNER/ADMIN de la organización del Assessment.
 */
export async function processCapabilityDocumentAdmissionsHandler(context: Ctx, capabilityId: string) {
  const { assessment, deps, baseRepository } = await prepararContexto(context, capabilityId);
  const rol = await deps.repository.getMembershipRole(assessment.organizationId, context.userId);
  assertDocumentGovernanceRole(rol);
  const { admitirCorrespondenciasDocumentales } = await import("./document-admission-bridge");
  // Repositorio base (sin scope): el puente verifica capacidad/pack/versión
  // de cada mapping y rechaza fail-closed los ajenos a esta capacidad.
  return admitirCorrespondenciasDocumentales(
    { engine: deps.engine, repository: baseRepository, knowledgeVersionId: assessment.knowledgeVersionId },
    { assessmentId: assessment.id, organizationId: assessment.organizationId, actorUserId: context.userId },
  );
}

export const revokeCapabilityDocumentMappingInput = (data: unknown) =>
  z.object({ mappingId: z.string().uuid(), note: z.string().max(1000).optional() }).strict().parse(data);

/**
 * R1 · Revocación gobernada: VALIDATED → SUPERSEDED vía RPC autorizado
 * (revoke_fragment_mapping, solo OWNER/ADMIN, auditable e idempotente) y
 * reproceso del puente para excluir la observación documental admitida
 * (registro de CONTROL append-only). Las observaciones manuales no se tocan.
 */
export async function revokeCapabilityDocumentMappingHandler(
  context: Ctx,
  capabilityId: string,
  data: ReturnType<typeof revokeCapabilityDocumentMappingInput>,
) {
  const runtime = await import("./runtime.server");
  type Client = Parameters<typeof runtime.asegurarContextoProductivo>[0];
  const client = context.supabase as Client;
  const assessment = await runtime.asegurarContextoProductivo(client, context.userId, capabilityId);
  // Autorización y pertenencia verificadas con la identidad del usuario (RLS)
  // ANTES de cualquier operación privilegiada.
  const { data: membership, error: roleError } = await client
    .from("memberships")
    .select("role")
    .eq("organization_id", assessment.organizationId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (roleError || !membership) throw new Error("DOCUMENT_GOVERNANCE_FORBIDDEN");
  assertDocumentGovernanceRole(membership.role as string);
  const { data: mapping, error: mappingError } = await client
    .from("fragment_mappings")
    .select("id, status")
    .eq("id", data.mappingId)
    .eq("organization_id", assessment.organizationId)
    .eq("assessment_id", assessment.id)
    .eq("capability_id", capabilityId)
    .maybeSingle();
  if (mappingError || !mapping) throw new Error("MAPPING_NOT_IN_CAPABILITY");
  // RPC creado en la migración 0004; los tipos generados aún no lo incluyen.
  const rpc = client.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
  const { error: rpcError } = await rpc("revoke_fragment_mapping", {
    _mapping_id: data.mappingId,
    _note: data.note ?? null,
  });
  if (rpcError) {
    if (rpcError.message.includes("FORBIDDEN")) throw new Error("DOCUMENT_GOVERNANCE_FORBIDDEN");
    if (rpcError.message.includes("REVOKE_REQUIRES_VALIDATED")) throw new Error("MAPPING_NOT_VALIDATED");
    throw new Error(rpcError.message);
  }
  // Reproceso del puente: la revocación excluye la observación documental de
  // las evaluaciones posteriores (append-only, historial intacto).
  const report = await processCapabilityDocumentAdmissionsHandler(context, capabilityId);
  return { mappingId: data.mappingId, revoked: true, admissionReport: report };
}

export async function submitCapabilityResponseHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof submitCapabilityResponseInput>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    const { respondent } = await asegurarRespondentPropio(deps, {
      organizationId: assessment.organizationId,
      assessmentId: assessment.id,
      capabilityId: deps.engine.pack.capability.id,
      userId: context.userId,
      acquisitionId: data.acquisitionId,
    });
    // UX-PROD-FIX-02 · Corregir: el autor de la respuesta o OWNER/ADMIN.
    // Un respondent invitado nunca corrige respuestas de otra persona.
    if (data.correctsObservationId) {
      const objetivo = (await deps.repository.listObservations(assessment.id)).find(
        (o) => o.id === data.correctsObservationId,
      );
      const rol = await deps.repository.getMembershipRole(assessment.organizationId, context.userId);
      const esAutor = Boolean(objetivo && objetivo.respondentId && objetivo.respondentId === respondent.id);
      if (objetivo && !esAutor && !(rol && ROLES_CON_PARTICIPACION_PLENA.has(rol))) {
        return {
          accepted: false,
          rejectionReason: casoUso.CORRECTION_NOT_AUTHORIZED,
          responseId: null,
          observationId: null,
          evaluationRunId: null,
          state: null,
        };
      }
    }
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
      ...(data.correctsObservationId ? { correctsObservationId: data.correctsObservationId } : {}),
    });
}

/**
 * Contexto colaborativo del assessment: personas invitadas, alcances,
 * evidencias registradas y aclaraciones pendientes por contradicción.
 */
export async function getCapabilityCollaborationHandler(context: Ctx, capabilityId: string, _data: Record<string, never>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps, baseRepository } = await prepararContexto(context, capabilityId);
    const capability = deps.engine.pack.capability;
    const [respondents, assignmentsTodas, evidence, links, clarifications, todasObs] = await Promise.all([
      deps.repository.listRespondents(assessment.organizationId),
      deps.repository.listAssignments(assessment.id),
      deps.repository.listEvidence(assessment.id),
      deps.repository.listEvidenceLinks(assessment.id),
      casoUso.getClarificationCandidates(deps, assessment.id),
      baseRepository.listObservations(assessment.id),
    ]);
    const observationsTodas = await deps.repository.listObservations(assessment.id);
    const corregidas = casoUso.observacionesCorregidas(observationsTodas);
    const observations = observationsTodas.filter((o) => !corregidas.has(o.id));
    // SPRINT-04-FIX · Solo los alcances de esta capacidad.
    const assignments = assignmentsTodas.filter((a) => casoUso.assignmentPerteneceACapacidad(a, capability));
    // UX-PROD-FIX-02 · Procedencia real de cada documento: vínculos explícitos
    // (capacidad + adquisición) y contexto de carga si quedó registrado.
    const obsPorId = new Map(todasObs.map((o) => [o.id, o]));
    const propias = new Set(observationsTodas.map((o) => o.id));
    const nombre = new Map(respondents.map((r) => [r.id, r.displayName ?? r.email ?? null]));
    return {
      assessmentId: assessment.id,
      capabilityId: capability.id,
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
      evidence: evidence.map((e) => {
        const vinculos = links
          .filter((l) => l.evidenceId === e.id)
          .map((l) => obsPorId.get(l.observationId))
          .filter((o): o is NonNullable<typeof o> => Boolean(o))
          .map((o) => ({
            observationId: o.id,
            capabilityId: (o.value as { capabilityId?: string }).capabilityId ?? "OP-01",
            acquisitionRef: o.value.acquisitionRef,
            thisCapability: propias.has(o.id),
          }));
        const aqui = vinculos.some((v) => v.thisCapability);
        const contexto = e.uploadContextCapabilityId ?? null;
        return {
          id: e.id,
          candidateRef: e.candidateRef,
          evidenceType: e.evidenceType,
          source: e.source,
          title: e.title,
          createdAt: e.createdAt,
          uploadedBy: e.respondentId ? (nombre.get(e.respondentId) ?? null) : null,
          uploadContextCapabilityId: contexto,
          links: vinculos,
          relation: aqui
            ? ("CAPABILITY" as const)
            : contexto === capability.id
              ? ("NEEDS_LINK" as const)
              : ("ORGANIZATION" as const),
        };
      }),
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
    // SPRINT-04-FIX · El alcance invitado debe pertenecer a esta capacidad.
    const capability = deps.engine.pack.capability;
    const scopeRef =
      data.scopeType === "INFORMATION_NEED" || data.scopeType === "SECTION"
        ? casoUso.calificarAlcance(capability.id, data.scopeRef)
        : data.scopeRef;
    if (!casoUso.assignmentPerteneceACapacidad({ scopeType: data.scopeType, scopeRef }, capability)) {
      throw new Error("SCOPE_OUTSIDE_CAPABILITY");
    }
    // Token de un solo uso generado en el servidor; solo se persiste su hash.
    const token = crypto.randomUUID();
    const salida = await casoUso.invitarRespondent(deps, {
      organizationId: assessment.organizationId,
      assessmentId: assessment.id,
      email: data.email,
      displayName: data.displayName ?? null,
      roleLabel: data.roleLabel ?? null,
      scopeType: data.scopeType,
      scopeRef,
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
      // PKG-02: única vez que el token en claro sale del servidor (solo se
      // persiste su hash). Va en el fragmento: no viaja en peticiones ni logs.
      invitationPath: `/invitacion#${token}`,
    };
}

/* ------------------------------------------------------------------ */
/* PKG-02 · Trabajo accionable, hub de 31 capacidades e invitaciones     */
/* ------------------------------------------------------------------ */

/** Espacio de trabajo accionable de una capacidad (server-authoritative). */
export async function getCapabilityWorkspaceHandler(context: Ctx, capabilityId: string, _data: Record<string, never>) {
  const casoUso = await import("./caso-uso");
  const { getRegisteredPack } = await import("./packs-registry");
  const { createActionableProjector } = await import("./actionable");
  const { assessment, deps } = await prepararContexto(context, capabilityId);
  const registro = getRegisteredPack(deps.engine.pack.capability.id);
  const evaluado = await casoUso.evaluarCapacidad(deps, assessment.id);
  if (!evaluado) throw new Error("ASSESSMENT_NOT_FOUND");
  const workspace = createActionableProjector(registro.pack).derive({
    engine: deps.engine,
    evaluation: evaluado.evaluation,
    answeredAcquisitionIds: evaluado.answeredAcquisitionIds,
    documentaryCoverage: evaluado.documentaryCoverage,
  });
  const projector = createActionableProjector(registro.pack);
  const [findings, observaciones, respondents, rol] = await Promise.all([
    deps.repository.listFindings(assessment.id),
    deps.repository.listObservations(assessment.id),
    deps.repository.listRespondents(assessment.organizationId),
    deps.repository.getMembershipRole(assessment.organizationId, context.userId),
  ]);
  const historial = construirHistorial({
    observaciones,
    respondents,
    userId: context.userId,
    plena: Boolean(rol && ROLES_CON_PARTICIPACION_PLENA.has(rol)),
    corregidas: casoUso.observacionesCorregidas(observaciones),
    project: (id) => projector.project(id),
  });
  const variables = new Map(
    ((deps.engine.pack as { variables?: { id: string; name?: string }[] }).variables ?? []).map((v) => [v.id, v.name ?? null]),
  );
  return {
    assessmentId: assessment.id,
    organizationId: assessment.organizationId,
    responseHistory: historial,
    clarificationDetails: evaluado.evaluation.contradictions.map((c) => {
      const entradas = historial.filter((h) => c.conflictingObservationIds.includes(h.observationId));
      return {
        variableRef: c.variableRef,
        variableName: variables.get(c.variableRef) ?? null,
        // Motivo según la procedencia real: declarado por la persona o valores distintos.
        reason: entradas.some((e) => e.knowledgeState === "CONTRADICTORY")
          ? ("DECLARED_CONTRADICTORY" as const)
          : ("DIVERGENT_VALUES" as const),
        conflictingSemanticValues: c.conflictingSemanticValues,
        observationIds: c.conflictingObservationIds,
        packClarificationAvailable: workspace.clarifications.length > 0,
      };
    }),
    capability: {
      capabilityId: registro.capabilityId,
      name: registro.name,
      domainId: registro.domainId,
      packId: registro.packId,
      packVersion: registro.packVersion,
      definition: (deps.engine.pack.capability as { definition?: string }).definition ?? null,
    },
    workspace,
    findingsCount: findings.length,
    contradictions: evaluado.evaluation.contradictions.map((c) => ({
      variableRef: c.variableRef,
      conflictingObservationIds: c.conflictingObservationIds,
    })),
  };
}

type HistorialEntrada = {
  observationId: string;
  acquisitionId: string;
  label: string | null;
  knowledgeState: string;
  semanticValue: string | null;
  notApplicableReason: string | null;
  recordedAt: string;
  submittedBy: string | null;
  submittedBySelf: boolean;
  correctsObservationId: string | null;
  supersededByObservationId: string | null;
  canCorrect: boolean;
  acquisition: import("./actionable").ActionableAcquisition | null;
};

/** UX-PROD-FIX-02 · Historial de respuestas de la capacidad (más reciente primero). */
function construirHistorial(p: {
  observaciones: import("./puertos").ObservationRecord[];
  respondents: import("./puertos").RespondentRecord[];
  userId: string;
  plena: boolean;
  corregidas: Set<string>;
  project: (acquisitionId: string) => import("./actionable").ActionableAcquisition | null;
}): HistorialEntrada[] {
  const porId = new Map(p.respondents.map((r) => [r.id, r]));
  const sustituta = new Map<string, string>();
  for (const o of p.observaciones) {
    const c = (o.value as { correctsObservationId?: string }).correctsObservationId;
    if (c) sustituta.set(c, o.id);
  }
  return p.observaciones
    .map((o) => {
      const r = o.respondentId ? porId.get(o.respondentId) : undefined;
      const propia = Boolean(r && r.userId === p.userId);
      const acq = p.project(o.value.acquisitionRef);
      const label =
        acq?.question ??
        acq?.informationNeedStatement ??
        acq?.correspondenceStatement ??
        (acq ? acq.variables.map((v) => v.name).filter(Boolean).join(" · ") || null : null);
      return {
        observationId: o.id,
        acquisitionId: o.value.acquisitionRef,
        label,
        knowledgeState: o.value.knowledgeState,
        semanticValue: o.value.semanticValue,
        notApplicableReason: o.value.notApplicableReason ?? null,
        recordedAt: o.createdAt,
        submittedBy: r ? (r.displayName ?? r.email ?? null) : null,
        submittedBySelf: propia,
        correctsObservationId: (o.value as { correctsObservationId?: string }).correctsObservationId ?? null,
        supersededByObservationId: sustituta.get(o.id) ?? null,
        canCorrect: !p.corregidas.has(o.id) && acq !== null && (propia || p.plena),
        acquisition: acq,
      };
    })
    .reverse();
}

/** Hub: estado real de las 31 capacidades. Lecturas memoizadas por petición. */
export async function getDiagnosticHubHandler(context: Ctx) {
  const inicio = Date.now();
  const runtime = await import("./runtime.server");
  const casoUso = await import("./caso-uso");
  const { getRegisteredPack } = await import("./packs-registry");
  const { createActionableProjector } = await import("./actionable");
  const { memoizeReads } = await import("./capability-scope");
  const base = memoizeReads(runtime.createSupabaseProductionRepository());
  const catalogo = runtime.listarCapacidadesDisponibles();

  // UX-PROD-FIX-02 · El bootstrap Organization→Case→Assessment se resuelve una
  // vez por grupo de cobertura (antes: 31 veces en serie). Mismo usuario, misma
  // identidad RLS, mismo Assessment pinneado: determinismo preservado.
  type ClienteUsuario = Parameters<typeof runtime.asegurarContextoProductivo>[0];
  const assessments = new Map<string, Promise<import("./puertos").AssessmentRecord>>();
  const resolverAssessment = (capabilityId: string) => {
    const clave = runtime.claveCoberturaCapacidad(capabilityId);
    let p = assessments.get(clave);
    if (!p) {
      p = runtime.asegurarContextoProductivo(context.supabase as ClienteUsuario, context.userId, capabilityId);
      assessments.set(clave, p);
    }
    return p;
  };

  async function evaluarEntrada(entrada: (typeof catalogo)[number]) {
    let ctx: Awaited<ReturnType<typeof prepararContexto>>;
    try {
      ctx = await prepararContexto(context, entrada.capabilityId, { baseRepository: base, resolverAssessment });
    } catch (e) {
      // Fail-closed por capacidad: un fallo de integridad en una no oculta las otras 30.
      console.error(`[hub] ${entrada.capabilityId}:`, e instanceof Error ? e.message : e);
      return {
        capabilityId: entrada.capabilityId,
        name: entrada.name,
        domainId: entrada.domainId,
        packVersion: entrada.packVersion,
        interactionState: "UNAVAILABLE" as const,
        counts: null,
        findingsCount: 0,
        assessmentId: null as string | null,
      };
    }
    const { assessment, deps } = ctx;
    const evaluado = await casoUso.evaluarCapacidad(deps, assessment.id);
    const workspace = evaluado
      ? createActionableProjector(getRegisteredPack(entrada.capabilityId).pack).derive({
          engine: deps.engine,
          evaluation: evaluado.evaluation,
          answeredAcquisitionIds: evaluado.answeredAcquisitionIds,
          documentaryCoverage: evaluado.documentaryCoverage,
        })
      : null;
    const findings = await deps.repository.listFindings(assessment.id);
    return {
      capabilityId: entrada.capabilityId,
      name: entrada.name,
      domainId: entrada.domainId,
      packVersion: entrada.packVersion,
      interactionState: workspace?.interactionState ?? "NOT_STARTED",
      counts: workspace?.counts ?? null,
      findingsCount: findings.length,
      assessmentId: assessment.id as string | null,
    };
  }

  // Concurrencia acotada: la evaluación es pura por capacidad y las lecturas
  // están memoizadas, así que el orden de ejecución no altera el resultado.
  const LIMITE = 8;
  const capacidades: Awaited<ReturnType<typeof evaluarEntrada>>[] = new Array(catalogo.length);
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: Math.min(LIMITE, catalogo.length) }, async () => {
      while (siguiente < catalogo.length) {
        const i = siguiente++;
        capacidades[i] = await evaluarEntrada(catalogo[i]!);
      }
    }),
  );

  // Totales reales persistidos (no son porcentajes ni madurez).
  const ids = [...new Set(capacidades.map((c) => c.assessmentId).filter((x): x is string => Boolean(x)))];
  const porAssessment = await Promise.all(
    ids.map(async (id) => {
      const [obs, ev, links] = await Promise.all([
        base.listObservations(id),
        base.listEvidence(id),
        base.listEvidenceLinks(id),
      ]);
      return { obs, ev, links };
    }),
  );
  const totales = {
    responsesActive: porAssessment.reduce((n, a) => n + casoUso.observacionesVigentes(a.obs).length, 0),
    responsesCorrected: porAssessment.reduce((n, a) => n + casoUso.observacionesCorregidas(a.obs).size, 0),
    evidenceUploaded: porAssessment.reduce((n, a) => n + a.ev.length, 0),
    evidenceLinked: porAssessment.reduce((n, a) => n + new Set(a.links.map((l) => l.evidenceId)).size, 0),
  };
  const elapsedMs = Date.now() - inicio;
  console.info(`[hub] ${catalogo.length} capacidades en ${elapsedMs} ms`);
  return {
    runtimeManifest: {
      identifier: runtime.KNOWLEDGE_RUNTIME_IDENTIFIER,
      version: runtime.KNOWLEDGE_RUNTIME_VERSION,
    },
    capabilities: capacidades.map(({ assessmentId: _a, ...c }) => c),
    totals: totales,
    elapsedMs,
  };
}

const aceptarSchema = z.object({ token: z.string().uuid() });
export const acceptInvitationInput = (data: unknown) => aceptarSchema.parse(data);

/**
 * Acepta una invitación con el token de un solo uso. La persona invitada no es
 * miembro de la organización (User ≠ Membership ≠ Respondent): se vincula su
 * usuario al Respondent invitado, sin crear membresía. Requiere que el email
 * autenticado coincida con el invitado. Nunca expone hashes.
 */
export async function acceptInvitationHandler(context: Ctx, data: ReturnType<typeof acceptInvitationInput>) {
  const runtime = await import("./runtime.server");
  type ClienteUsuario = { auth: { getUser: () => Promise<{ data: { user: { email?: string | null } | null } }> } };
  const { data: usuario } = await (context.supabase as ClienteUsuario).auth.getUser();
  const email = usuario.user?.email?.toLowerCase() ?? null;
  if (!email) return { accepted: false, reason: "EMAIL_REQUIRED" as const };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = runtime.hashTokenInvitacion(data.token);
  const inv = await supabaseAdmin
    .from("invitations")
    .select("id, respondent_id, status, expires_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (inv.error || !inv.data) return { accepted: false, reason: "INVITATION_NOT_FOUND" as const };
  if (inv.data.status !== "PENDING") return { accepted: false, reason: "INVITATION_NOT_PENDING" as const };
  if (inv.data.expires_at && new Date(inv.data.expires_at) < new Date()) {
    return { accepted: false, reason: "INVITATION_EXPIRED" as const };
  }
  const resp = await supabaseAdmin
    .from("respondents")
    .select("id, email, user_id")
    .eq("id", inv.data.respondent_id)
    .maybeSingle();
  if (resp.error || !resp.data) return { accepted: false, reason: "INVITATION_NOT_FOUND" as const };
  if ((resp.data.email ?? "").toLowerCase() !== email) {
    return { accepted: false, reason: "EMAIL_MISMATCH" as const };
  }
  if (resp.data.user_id && resp.data.user_id !== context.userId) {
    return { accepted: false, reason: "RESPONDENT_ALREADY_BOUND" as const };
  }
  const ahora = new Date().toISOString();
  const r1 = await supabaseAdmin
    .from("respondents")
    .update({ user_id: context.userId, status: "ACTIVE" })
    .eq("id", resp.data.id);
  if (r1.error) throw new Error("respondents.update");
  const r2 = await supabaseAdmin
    .from("invitations")
    .update({ status: "ACCEPTED", accepted_at: ahora })
    .eq("id", inv.data.id)
    .eq("status", "PENDING");
  if (r2.error) throw new Error("invitations.update");
  return { accepted: true, reason: null };
}

/** Registra evidencia y la vincula a las observaciones que soporta. */
export const registerCapabilityEvidenceInput = (data: unknown) => evidenciaSchema.parse(data);

export async function registerCapabilityEvidenceHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof registerCapabilityEvidenceInput>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    const { respondent, assignment } = await asegurarRespondentPropio(deps, {
      organizationId: assessment.organizationId,
      assessmentId: assessment.id,
      capabilityId: deps.engine.pack.capability.id,
      userId: context.userId,
    });
    if (!assignment) throw new Error("OUT_OF_ASSIGNMENT_SCOPE");
    // SPRINT-04-FIX · Solo se vincula a observaciones de esta capacidad.
    if (data.observationIds?.length) {
      const propias = new Set((await deps.repository.listObservations(assessment.id)).map((o) => o.id));
      if (data.observationIds.some((id) => !propias.has(id))) throw new Error("OBSERVATION_OUTSIDE_CAPABILITY");
    }
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
      // Procedencia: dónde se cargó. No implica vínculo ni validación.
      uploadContextCapabilityId: deps.engine.pack.capability.id,
      ...(data.observationIds ? { observationIds: data.observationIds } : {}),
    });
    return {
      evidenceId: salida.evidence.id,
      linkedObservationIds: salida.links.map((l) => l.observationId),
      evaluationRunId: salida.evaluationRunId,
      state: salida.state,
    };
}

/** UX-PROD-FIX-02 · Vincula un documento existente a una respuesta de esta capacidad. */
export const linkCapabilityEvidenceInput = (data: unknown) =>
  z.object({ evidenceId: z.string().uuid(), observationId: z.string().uuid() }).parse(data);

export async function linkCapabilityEvidenceHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof linkCapabilityEvidenceInput>) {
  const casoUso = await import("./caso-uso");
  const { assessment, deps } = await prepararContexto(context, capabilityId);
  const { assignment } = await asegurarRespondentPropio(deps, {
    organizationId: assessment.organizationId,
    assessmentId: assessment.id,
    capabilityId: deps.engine.pack.capability.id,
    userId: context.userId,
  });
  if (!assignment) throw new Error("OUT_OF_ASSIGNMENT_SCOPE");
  const obs = casoUso.observacionesVigentes(await deps.repository.listObservations(assessment.id));
  if (!obs.some((o) => o.id === data.observationId)) throw new Error("OBSERVATION_OUTSIDE_CAPABILITY");
  // Mismo tenant y mismo assessment: nunca documentos de otra organización.
  const ev = await deps.repository.listEvidence(assessment.id);
  if (!ev.some((e) => e.id === data.evidenceId && e.organizationId === assessment.organizationId)) {
    throw new Error("EVIDENCE_NOT_IN_ORGANIZATION");
  }
  const salida = await casoUso.vincularEvidenciaExistente(deps, {
    organizationId: assessment.organizationId,
    assessmentId: assessment.id,
    evidenceId: data.evidenceId,
    observationId: data.observationId,
  });
  return { linked: true, alreadyLinked: salida.alreadyLinked, evaluationRunId: salida.evaluationRunId };
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
