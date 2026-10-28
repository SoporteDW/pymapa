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
import { approvedCoverageCriteria, coveredAcquisitionOf, criteriaEligible } from "./coverage-criteria";
import { structuredCoverageDeclarationSchema } from "./structured-coverage";
import { hasVerifiedStructuredCoverage } from "./documentary-coverage";

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
  const report = await admitirCorrespondenciasDocumentales(
    { engine: deps.engine, repository: baseRepository, knowledgeVersionId: assessment.knowledgeVersionId },
    { assessmentId: assessment.id, organizationId: assessment.organizationId, actorUserId: context.userId },
  );
  // MVP-BETA-INT-01 · Solo si cambió el conjunto de observaciones: el Engine
  // reevalúa (findings, NI, variables) con el mismo EvaluationRun gobernado.
  let evaluationRunId: string | null = null;
  if (report.admitted > 0 || report.invalidated > 0) {
    const casoUso = await import("./caso-uso");
    const r = await casoUso.reevaluarTrasCambioDocumental(deps, {
      assessmentId: assessment.id,
      organizationId: assessment.organizationId,
      trigger: report.invalidated > 0 ? "OBSERVATION_UPDATED" : "EVIDENCE_ADDED",
    });
    evaluationRunId = r.evaluationRunId;
  }
  return { ...report, evaluationRunId };
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
  // Importante: invocar con .call(client, …) — rpc usa this.rest internamente.
  const rpc = client.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
  const { error: rpcError } = await rpc.call(client, "revoke_fragment_mapping", {
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
  // Resumen compacto y serializable (el informe completo lo expone
  // processCapabilityDocumentAdmissions).
  return {
    mappingId: data.mappingId,
    revoked: true,
    admitted: report.admitted,
    invalidated: report.invalidated,
    rejected: report.rejected.length,
  };
}

/* ------------------------------------------------------------------ */
/* INT-01-COV-02 · Decisión gobernada de cobertura documental           */
/* ------------------------------------------------------------------ */

export const declareCapabilityDocumentCoverageInput = (data: unknown) =>
  structuredCoverageDeclarationSchema.parse(data);

/**
 * COV-02 · Declaración de cobertura documental, decisión SEPARADA de la
 * validación factual: un OWNER/ADMIN declara FULL (la evidencia vigente
 * cubre por completo la adquisición canónica) o revierte a PARTIAL. El RPC
 * set_fragment_mapping_coverage (migración COV-02) exige mapping VALIDATED,
 * justificación y adquisición igual a la correspondencia factual; la guarda
 * de transiciones audita cada decisión (FRAGMENT_MAPPING_COVERAGE_DECIDED).
 * FULL nunca se transfiere a otra capacidad: la decisión queda ligada a
 * organización, assessment, capacidad y adquisición del mapping.
 */
export async function declareCapabilityDocumentCoverageHandler(
  context: Ctx,
  capabilityId: string,
  data: ReturnType<typeof declareCapabilityDocumentCoverageInput>,
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
    .select("id, status, target_type, target_ref, factual_correspondence_ref")
    .eq("id", data.mappingId)
    .eq("organization_id", assessment.organizationId)
    .eq("assessment_id", assessment.id)
    .eq("capability_id", capabilityId)
    .maybeSingle();
  if (mappingError || !mapping) throw new Error("MAPPING_NOT_IN_CAPABILITY");
  const row = mapping as { target_type: string; target_ref: string; factual_correspondence_ref: string | null };
  // COV-03A/B: VARIABLE (factual) or ACQUISITION (pure coverage, no observation).
  const factualRef = coveredAcquisitionOf({ targetType: row.target_type, targetRef: row.target_ref, factualCorrespondenceRef: row.factual_correspondence_ref });
  if (!factualRef) throw new Error("COVERAGE_REQUIRES_FACTUAL_MAPPING");
  const rpcName = row.target_type === "ACQUISITION" ? "set_structured_acquisition_coverage" : "set_structured_fragment_coverage";
  // La adquisición cubierta debe existir en el pack fijado al Assessment.
  const engine = runtime.cargarEngine(capabilityId);
  if (!engine.getAcquisition(factualRef)) throw new Error("FACTUAL_ACQUISITION_NOT_IN_PACK");
  if (data.acquisitionRef !== factualRef || data.knowledgeVersionId !== assessment.knowledgeVersionId) throw new Error("COVERAGE_IDENTITY_MISMATCH");
  // Atomic authenticated RPC repeats all checks under a row lock.
  const rpc = client.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: { coverageScope: "FULL" | "PARTIAL"; rejectionReasons: string[]; revision: number } | null; error: { message: string } | null }>;
  const { data: decision, error: rpcError } = await rpc.call(client, rpcName, {
    _declaration: data,
  });
  if (rpcError) {
    if (rpcError.message.includes("FORBIDDEN")) throw new Error("DOCUMENT_GOVERNANCE_FORBIDDEN");
    if (rpcError.message.includes("COVERAGE_REQUIRES_VALIDATED_MAPPING")) throw new Error("MAPPING_NOT_VALIDATED");
    throw new Error(rpcError.message);
  }
  if (!decision) throw new Error("COVERAGE_DECISION_NOT_RETURNED");
  return {
    mappingId: data.mappingId,
    ...decision,
    acquisitionRef: decision.coverageScope === "FULL" ? factualRef : null,
  };
}

export async function submitCapabilityResponseHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof submitCapabilityResponseInput>) {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    // Comprobar pertenencia antes de persistir; el Assessment es compartido.
    if (data.evidenceIds?.length) {
      const propias = new Set((await deps.repository.listEvidence(assessment.id))
        .filter((e) => e.organizationId === assessment.organizationId && e.assessmentId === assessment.id)
        .map((e) => e.id));
      if (data.evidenceIds.some((id) => !propias.has(id))) throw new Error("EVIDENCE_NOT_IN_ASSESSMENT");
    }
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
    // DEC-054 · Trazabilidad pregunta→respuesta derivada en servidor, nunca del cliente.
    const oq = createActionableProjector(getRegisteredPack(capabilityId).pack).project(data.acquisitionId)?.operativeQuestion;
    const rawConTrazabilidad = oq
      ? { ...(data.rawInput ?? {}), operativeQuestion: { questionId: oq.questionId, wordingVersion: oq.wordingVersion, sourceRef: oq.sourceRef } }
      : data.rawInput;
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
      ...(rawConTrazabilidad ? { rawInput: rawConTrazabilidad } : {}),
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
  const { assessment, deps, baseRepository } = await prepararContexto(context, capabilityId);
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
  const [findings, observaciones, respondents, rol, mappingsDocumentales] = await Promise.all([
    deps.repository.listFindings(assessment.id),
    deps.repository.listObservations(assessment.id),
    deps.repository.listRespondents(assessment.organizationId),
    deps.repository.getMembershipRole(assessment.organizationId, context.userId),
    baseRepository.listDocumentMappings(assessment.id),
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
      diagnosticMode: projector.diagnosticMode,
    },
    workspace,
    findingsCount: findings.length,
    contradictions: evaluado.evaluation.contradictions.map((c) => ({
      variableRef: c.variableRef,
      conflictingObservationIds: c.conflictingObservationIds,
    })),
    // INT-01-COV-02 · Correspondencias documentales de esta capacidad con su
    // cobertura gobernada; la decisión FULL/PARTIAL es separada de la
    // validación factual y solo la toma OWNER/ADMIN.
    userRole: rol ?? null,
    // MVP-BETA-INT-01 · Autorización SYNTHETIC_QA_ONLY leída de la base (RLS), nunca del cliente.
    syntheticQaIngestionAuthorized: await (async () => {
      const cliente = context.supabase as { from: (t: string) => { select: (c: string) => { eq: (a: string, b: unknown) => { eq: (a: string, b: unknown) => { maybeSingle: () => Promise<{ data: unknown }> } } } } };
      // Fail-closed: cualquier error de lectura equivale a no autorizado.
      try {
        const { data } = await cliente.from("synthetic_qa_ingestion_authorizations").select("organization_id")
          .eq("organization_id", assessment.organizationId).eq("active", true).maybeSingle();
        return Boolean(data);
      } catch {
        return false;
      }
    })(),
    documentaryMappings: mappingsDocumentales
      .filter((m) => m.capabilityId === deps.engine.pack.capability.id)
      .map((m) => ({
        id: m.id,
        status: m.status,
        targetType: m.targetType,
        targetRef: m.targetRef,
        factualCorrespondenceRef: m.factualCorrespondenceRef,
        fragmentText: m.fragmentText,
        interpretationStatement: m.interpretationStatement,
        evidenceId: m.evidenceId,
        coverageScope: m.coverageScope ?? "PARTIAL",
        coverageAcquisitionRef: m.coverageAcquisitionRef ?? null,
        coverageJustification: m.coverageJustification ?? null,
        coverageDecidedAt: m.coverageDecidedAt ?? null,
        fragmentId: m.fragmentId,
        knowledgeVersionId: m.knowledgeVersionId,
        coverageRevision: m.coverageRevision ?? 0,
        coverageCriteria: (() => {
          const criteria = approvedCoverageCriteria(m.knowledgeVersionId, m.capabilityId, coveredAcquisitionOf(m) ?? "");
          return criteriaEligible(criteria, m.coveragePilotAuthorized === true) ? criteria : null;
        })(),
        coveredAcquisitionRef: coveredAcquisitionOf(m),
        coverageEvaluation: m.coverageEvaluation ?? null,
        coverageVerified: hasVerifiedStructuredCoverage(m),
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
        diagnosticMode: createActionableProjector(getRegisteredPack(entrada.capabilityId).pack).diagnosticMode,
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
      diagnosticMode: createActionableProjector(getRegisteredPack(entrada.capabilityId).pack).diagnosticMode,
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
  responsibleLabel: z.string().trim().min(1).max(200).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
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
    const { assessment, deps, baseRepository } = await prepararContexto(context, capabilityId);
    const [findings, dependencies, recommendations, interventions, auditEvents, pendientes, observaciones, mappingsDoc] = await Promise.all([
      casoUso.listFindings(deps, assessment.id),
      casoUso.listDerivedDependencyReferences(deps, assessment.id),
      casoUso.listRecommendationCandidates(deps, assessment.id),
      casoUso.listInterventions(deps, assessment.id),
      deps.repository.listAuditEvents(assessment.organizationId),
      casoUso.listFindingsAwaitingResolution(deps, assessment.id),
      deps.repository.listObservations(assessment.id),
      baseRepository.listDocumentMappings(assessment.id),
    ]);
    // MVP-BETA-INT-01 · Trazabilidad del soporte: observaciones enlazadas al
    // finding y, si son documentales, su fragmento literal y página.
    const { supabaseAdmin: dbSoporte } = await import("@/integrations/supabase/client.server");
    const idsFindings = findings.map((f) => f.id);
    const enlaces = idsFindings.length
      ? (await dbSoporte.from("finding_observations").select("finding_id, observation_id").in("finding_id", idsFindings)).data ?? []
      : [];
    const obsPorId = new Map(observaciones.map((o) => [o.id, o]));
    const mappingPorId = new Map(mappingsDoc.map((m) => [m.id, m]));
    const reglas = new Map(((deps.engine.pack as { rules?: { id: string; statement?: string; classification?: string }[] }).rules ?? []).map((r) => [r.id, r]));
    const nombresVar = new Map(((deps.engine.pack as { variables?: { id: string; name?: string }[] }).variables ?? []).map((v) => [v.id, v.name ?? null]));
    const soportePara = (findingId: string) =>
      enlaces.filter((e) => e.finding_id === findingId).map((e) => {
        const o = obsPorId.get(e.observation_id);
        const prov = o?.value.documentProvenance;
        const m = prov ? mappingPorId.get(prov.mappingId) : undefined;
        return {
          observationId: e.observation_id,
          variableRef: o?.variableRef ?? null,
          acquisitionRef: o?.value.acquisitionRef ?? null,
          knowledgeState: o?.value.knowledgeState ?? null,
          origin: prov ? ("DOCUMENT" as const) : ("RESPONSE" as const),
          document: prov ? { mappingId: prov.mappingId, fragmentId: prov.fragmentId, evidenceId: prov.evidenceId,
            fragmentText: m?.fragmentText ?? null, mappingStatus: m?.status ?? null } : null,
        };
      });

    const conActividades = await Promise.all(
      interventions.map(async (i) => {
        const activities = await casoUso.listActivities(deps, i.id);
        const conEntregables = await Promise.all(
          activities.map(async (a) => ({
            id: a.id,
            activityRef: a.activityRef,
            title: a.title,
            state: a.state,
            responsibleLabel: a.responsibleLabel ?? null,
            dueDate: a.dueDate ?? null,
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
        rules: f.ruleRefs.map((ref) => ({ ruleRef: ref, statement: reglas.get(ref)?.statement ?? null, classification: reglas.get(ref)?.classification ?? null })),
        variables: f.variableRefs.map((ref) => ({ variableRef: ref, name: nombresVar.get(ref) ?? null })),
        support: soportePara(f.id),
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
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    // MVP-BETA-INT-01 · Revisar un hallazgo es decisión de gobierno: OWNER/ADMIN en servidor.
    assertDocumentGovernanceRole(await deps.repository.getMembershipRole(assessment.organizationId, context.userId));
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
    // MVP-BETA-INT-01 · Intervenciones humanas: decisión de gobierno, OWNER/ADMIN en servidor.
    assertDocumentGovernanceRole(await deps.repository.getMembershipRole(assessment.organizationId, context.userId));
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
    // MVP-BETA-INT-01 · Intervenciones humanas: decisión de gobierno, OWNER/ADMIN en servidor.
    assertDocumentGovernanceRole(await deps.repository.getMembershipRole(assessment.organizationId, context.userId));
    const salida = await casoUso.crearActividad(deps, {
      interventionId: data.interventionId,
      organizationId: assessment.organizationId,
      title: data.title,
      activityRef: data.activityRef ?? null,
      responsibleLabel: data.responsibleLabel ?? null,
      dueDate: data.dueDate ?? null,
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
    const { assessment, deps } = await prepararContexto(context, capabilityId);
    // MVP-BETA-INT-01 · Intervenciones humanas: decisión de gobierno, OWNER/ADMIN en servidor.
    assertDocumentGovernanceRole(await deps.repository.getMembershipRole(assessment.organizationId, context.userId));
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
    // MVP-BETA-INT-01 · Intervenciones humanas: decisión de gobierno, OWNER/ADMIN en servidor.
    assertDocumentGovernanceRole(await deps.repository.getMembershipRole(assessment.organizationId, context.userId));
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

/* ------------------------------------------------------------------ */
/* MVP-BETA-INT-01 · Ingesta documental determinista SYNTHETIC_QA_ONLY  */
/* ------------------------------------------------------------------ */

export const processSyntheticDocumentInput = (data: unknown) =>
  z.object({ evidenceId: z.string().uuid() }).strict().parse(data);

async function sha256Texto(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Documento cargado → versión → extracción local (unpdf) → fragmento literal
 * con página y hash → interpretación literal → correspondencia CANDIDATE.
 * Bloqueos en servidor: OWNER/ADMIN, organización autorizada en
 * synthetic_qa_ingestion_authorizations y marca SYNTHETIC_QA_ONLY en el texto.
 * Nada se valida, admite ni declara cubierto aquí. Idempotente por documento.
 */
export async function processSyntheticDocumentHandler(
  context: Ctx,
  capabilityId: string,
  data: ReturnType<typeof processSyntheticDocumentInput>,
) {
  const runtime = await import("./runtime.server");
  type Client = Parameters<typeof runtime.asegurarContextoProductivo>[0];
  const client = context.supabase as Client;
  const engine = runtime.cargarEngine(capabilityId);
  const assessment = await runtime.asegurarContextoProductivo(client, context.userId, capabilityId);
  const org = assessment.organizationId;
  // 1. Autorización con la identidad del usuario (RLS) ANTES de todo acceso privilegiado.
  const { data: membership } = await client.from("memberships").select("role")
    .eq("organization_id", org).eq("user_id", context.userId).maybeSingle();
  assertDocumentGovernanceRole((membership?.role as string | undefined) ?? null);
  const { data: autorizacion } = await client.from("synthetic_qa_ingestion_authorizations")
    .select("organization_id, rule_set_version").eq("organization_id", org).eq("active", true).maybeSingle();
  const ingesta = await import("./ingesta-sintetica");
  if (!autorizacion || autorizacion.rule_set_version !== ingesta.SYNTHETIC_QA_RULE_SET_VERSION) {
    throw new Error("SYNTHETIC_QA_ONLY_NOT_AUTHORIZED");
  }
  const { data: evidencia } = await client.from("evidence")
    .select("id, organization_id, storage_bucket, storage_path, title")
    .eq("id", data.evidenceId).eq("organization_id", org).maybeSingle();
  if (!evidencia) throw new Error("EVIDENCE_NOT_IN_ORGANIZATION");
  if (!evidencia.storage_bucket || !evidencia.storage_path) throw new Error("EVIDENCE_WITHOUT_FILE");

  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  // 2. Idempotencia: un documento se procesa una sola vez (versión 1).
  const previa = await db.from("evidence_versions").select("id").eq("organization_id", org)
    .eq("evidence_id", evidencia.id).eq("version_number", 1).maybeSingle();
  if (previa.data) return { alreadyProcessed: true as const, evidenceVersionId: previa.data.id, proposals: [] };

  // 3. Bytes reales del archivo privado de la organización (RLS de storage).
  const descarga = await client.storage.from(evidencia.storage_bucket).download(evidencia.storage_path);
  if (descarga.error || !descarga.data) throw new Error("EVIDENCE_FILE_UNAVAILABLE");
  const bytes = new Uint8Array(await descarga.data.arrayBuffer());
  const { extraerPdf } = await import("@/lib/document-first/pdf-texto");
  const doc = await extraerPdf(bytes);
  const propuestas = ingesta.proponerCorrespondenciasSinteticas(doc.lineas, capabilityId);
  // 4. Destinos verificados contra el pack fijado: nunca se inventa un id.
  for (const p of propuestas) {
    const acq = engine.getAcquisition(p.rule.factualCorrespondenceRef);
    if (!acq || !acq.variableRefs.includes(p.rule.targetRef)) throw new Error("SYNTHETIC_RULE_TARGET_NOT_IN_PACK");
    if (!ingesta.citaEsLiteral(doc.textoPorPagina[p.page], p.verbatim)) throw new Error("SYNTHETIC_QUOTE_NOT_LITERAL");
  }
  const fallo = (paso: string, e: { message: string; code?: string } | null) => {
    if (e) throw new Error(`SYNTHETIC_INGEST_FAILED:${paso}:${e.message}`);
  };
  const textoHash = await sha256Texto(Object.entries(doc.textoPorPagina).map(([p, t]) => `${p}\n${t}`).join("\n\f\n"));
  const ver = await db.from("evidence_versions").insert({
    organization_id: org, evidence_id: evidencia.id, version_number: 1, content_sha256: doc.sha256,
    storage_bucket: evidencia.storage_bucket, storage_path: evidencia.storage_path, mime_type: "application/pdf",
    byte_size: bytes.length, created_by: context.userId,
  }).select("id").single();
  if (ver.error?.code === "23505") return { alreadyProcessed: true as const, evidenceVersionId: null, proposals: [] };
  fallo("evidence_versions", ver.error);
  const ahora = new Date().toISOString();
  const ext = await db.from("document_extractions").insert({
    organization_id: org, evidence_version_id: ver.data!.id, extraction_version: 1, status: "COMPLETED",
    model_provider: "LOCAL_DETERMINISTIC", model_id: doc.extractorVersion,
    prompt_ref: `${ingesta.SYNTHETIC_QA_MARKER}|rules:${ingesta.SYNTHETIC_QA_RULE_SET_VERSION}|text-sha256:${textoHash}|pages:${doc.paginas}`,
    knowledge_version_id: assessment.knowledgeVersionId, started_at: ahora, completed_at: ahora,
  }).select("id").single();
  fallo("document_extractions", ext.error);
  const salida: { mappingId: string; fragmentId: string; ruleId: string; page: number; targetRef: string; fragmentSha256: string }[] = [];
  let i = 0;
  for (const p of propuestas) {
    const fragmentSha256 = await sha256Texto(p.verbatim);
    const f = await db.from("evidence_fragments").insert({
      organization_id: org, extraction_id: ext.data!.id, sequence_index: i++, verbatim_text: p.verbatim,
      locator: { page: p.page, section: p.section }, text_sha256: fragmentSha256,
    }).select("id").single();
    fallo("evidence_fragments", f.error);
    // Interpretación literal: la regla no interpreta; el enunciado ES la cita.
    const it = await db.from("fragment_interpretations").insert({
      organization_id: org, fragment_id: f.data!.id, statement: p.verbatim,
      model_provider: "LOCAL_DETERMINISTIC", model_id: p.rule.ruleId, prompt_ref: ingesta.SYNTHETIC_QA_RULE_SET_VERSION,
    }).select("id").single();
    fallo("fragment_interpretations", it.error);
    const m = await db.from("fragment_mappings").insert({
      organization_id: org, assessment_id: assessment.id, fragment_id: f.data!.id, interpretation_id: it.data!.id,
      capability_id: capabilityId, target_type: p.rule.targetType, target_ref: p.rule.targetRef,
      factual_correspondence_ref: p.rule.factualCorrespondenceRef,
      knowledge_version_id: assessment.knowledgeVersionId, knowledge_pack_id: engine.pack.packId,
      knowledge_pack_version: engine.pack.packVersion, proposed_by: "DETERMINISTIC_RULE",
      decision_note: `${ingesta.SYNTHETIC_QA_MARKER} · regla ${p.rule.ruleId} (${ingesta.SYNTHETIC_QA_RULE_SET_VERSION}): coincidencia léxica del encabezado «${p.section}»; no es interpretación semántica. Requiere revisión OWNER/ADMIN.`,
    }).select("id").single();
    fallo("fragment_mappings", m.error);
    salida.push({ mappingId: m.data!.id, fragmentId: f.data!.id, ruleId: p.rule.ruleId, page: p.page, targetRef: p.rule.targetRef, fragmentSha256 });
  }
  await db.from("audit_events").insert({
    organization_id: org, assessment_id: assessment.id, event_type: "SYNTHETIC_DOCUMENT_PROCESSED",
    subject_table: "evidence_versions", subject_id: ver.data!.id, actor_user_id: context.userId,
    detail: { evidenceId: evidencia.id, extractionId: ext.data!.id, contentSha256: doc.sha256, textSha256: textoHash,
      ruleSet: ingesta.SYNTHETIC_QA_RULE_SET_VERSION, capabilityId, proposals: salida.length },
  });
  return { alreadyProcessed: false as const, evidenceVersionId: ver.data!.id, extractionId: ext.data!.id, contentSha256: doc.sha256, proposals: salida };
}

/* ------------------------------------------------------------------ */
/* PYM-NOV-MVP31 · Expediente documental transversal (31 capacidades)   */
/* ------------------------------------------------------------------ */

type FragmentosPorEvidencia = Map<string, { title: string; pages: number; fragments: import("./expediente-mapper").FragmentoExpediente[]; error: string | null }>;

/** Lee con la identidad del usuario (RLS) los PDF del assessment y extrae fragmentos literales. */
async function leerExpediente(context: Ctx, evidencias: import("./puertos").EvidenceRecord[]): Promise<FragmentosPorEvidencia> {
  const { extraerPdf } = await import("@/lib/document-first/pdf-texto");
  type Storage = { storage: { from: (b: string) => { download: (p: string) => Promise<{ data: Blob | null; error: unknown }> } } };
  const client = context.supabase as Storage;
  const salida: FragmentosPorEvidencia = new Map();
  const { fragmentosConContexto } = await import("./expediente-extraction");
  for (const e of evidencias) {
    const title = e.title ?? e.storagePath?.split("/").pop() ?? e.id;
    if (!e.storageBucket || !e.storagePath || !/\.pdf$/i.test(e.storagePath)) continue;
    try {
      const d = await client.storage.from(e.storageBucket).download(e.storagePath);
      if (d.error || !d.data) throw new Error("EVIDENCE_FILE_UNAVAILABLE");
      const doc = await extraerPdf(new Uint8Array(await d.data.arrayBuffer()));
      salida.set(e.id, {
        title,
        pages: doc.paginas,
        error: null,
        fragments: fragmentosConContexto(doc).map((f) => ({ evidenceId: e.id, documentTitle: title, fragmentId: f.id, page: f.pagina, section: f.seccion, text: f.texto })),
      });
    } catch (err) {
      salida.set(e.id, { title, pages: 0, fragments: [], error: err instanceof Error ? err.message : "EXTRACTION_FAILED" });
    }
  }
  return salida;
}

/**
 * Procesa los documentos del assessment contra las 448 adquisiciones de las 31
 * capacidades. Determinista y de solo lectura: devuelve propuestas con cita,
 * página y coincidencia léxica; nada se responde ni se cubre sin confirmación.
 */
export async function getExpedienteHandler(context: Ctx) {
  const inicio = Date.now();
  const runtime = await import("./runtime.server");
  const casoUso = await import("./caso-uso");
  const { getRegisteredPack } = await import("./packs-registry");
  const { createActionableProjector } = await import("./actionable");
  const { memoizeReads } = await import("./capability-scope");
  const mapper = await import("./expediente-mapper");
  const base = memoizeReads(runtime.createSupabaseProductionRepository());
  const catalogo = runtime.listarCapacidadesDisponibles();
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

  const capacidades: {
    capabilityId: string; name: string; domainId: string; diagnosticMode: string; findingsCount: number;
    assessmentId: string; organizationId: string; catalogo: import("./expediente-mapper").AdquisicionCatalogo[]; answered: Set<string>;
  }[] = [];
  const LIMITE = 1; // La evaluación hace varias lecturas paralelas; presupuesto saliente <= 6.
  let siguiente = 0;
  await Promise.all(Array.from({ length: LIMITE }, async () => {
    while (siguiente < catalogo.length) {
      const entrada = catalogo[siguiente++];
      if (!entrada) continue;
      const { assessment, deps } = await prepararContexto(context, entrada.capabilityId, { baseRepository: base, resolverAssessment });
      const evaluado = await casoUso.evaluarCapacidad(deps, assessment.id);
      const pack = getRegisteredPack(entrada.capabilityId).pack;
      const findings = await deps.repository.listFindings(assessment.id);
      capacidades.push({
        capabilityId: entrada.capabilityId, name: entrada.name, domainId: entrada.domainId,
        diagnosticMode: createActionableProjector(pack).diagnosticMode, findingsCount: findings.length,
        assessmentId: assessment.id, organizationId: assessment.organizationId,
        catalogo: mapper.catalogoDePack(entrada.capabilityId, pack),
        answered: new Set(evaluado?.answeredAcquisitionIds ?? []),
      });
    }
  }));
  capacidades.sort((a, b) => catalogo.findIndex((c) => c.capabilityId === a.capabilityId) - catalogo.findIndex((c) => c.capabilityId === b.capabilityId));
  const primera = capacidades[0];
  if (!primera) throw new Error("EMPTY_CAPABILITY_REGISTRY");
  const assessmentId = primera.assessmentId;
  const organizationId = primera.organizationId;
  const evidencias = (await base.listEvidence(assessmentId)).filter((e) => e.organizationId === organizationId && e.assessmentId === assessmentId);
  const docs = await leerExpediente(context, evidencias);
  const fragmentos = [...docs.values()].flatMap((d) => d.fragments);
  const todas = capacidades.flatMap((c) => c.catalogo);
  const respondidas = new Set(capacidades.flatMap((c) => [...c.answered].map((id) => `${c.capabilityId}::${id}`)));
  const propuestas = mapper.proponerCorrespondencias(todas, fragmentos, respondidas);
  const todasPropuestas = mapper.proponerCorrespondencias(todas, fragmentos, new Set());
  const documentalUnica = new Set(todasPropuestas.map((p) => `${p.capabilityId}::${p.acquisitionId}`));
  const respuestas = await base.listResponses(assessmentId);
  const confirmadasDocumentales = new Set(respuestas.filter((r) => {
    const raw = r.payload?.["raw"] as { origin?: string } | null;
    return raw?.origin === "EXPEDIENTE_DOCUMENTAL";
  }).map((r) => `${r.payload?.["capabilityId"] ?? "OP-01"}::${r.acquisitionRef}`).filter((k) => respondidas.has(k)));
  const conPropuesta = new Set(propuestas.map((p) => `${p.capabilityId}::${p.acquisitionId}`));

  const porCapacidad = capacidades.map((c) => {
    const pendientes = c.catalogo.filter((a) => !c.answered.has(a.acquisitionId) && !conPropuesta.has(`${c.capabilityId}::${a.acquisitionId}`));
    return {
      capabilityId: c.capabilityId, name: c.name, domainId: c.domainId, diagnosticMode: c.diagnosticMode, findingsCount: c.findingsCount,
      total: c.catalogo.length,
      answered: c.answered.size,
      proposals: propuestas.filter((p) => p.capabilityId === c.capabilityId).length,
      pending: pendientes.map((a) => ({ acquisitionId: a.acquisitionId, label: a.label, labelSource: a.labelSource, closedOptions: a.closedOptions })),
    };
  });
  const total = todas.length;
  return {
    mapperVersion: mapper.VERSION_MAPEADOR_EXPEDIENTE,
    assessmentId,
    organizationId,
    documents: [...docs.entries()].map(([evidenceId, d]) => ({ evidenceId, title: d.title, pages: d.pages, fragments: d.fragments.length, error: d.error })),
    totals: {
      acquisitions: total,
      answered: respondidas.size,
      documentaryCandidateAcquisitions: documentalUnica.size,
      documentaryConfirmedAcquisitions: confirmadasDocumentales.size,
      documentaryCandidatePercent: Math.round(documentalUnica.size / total * 1000) / 10,
      proposedAcquisitions: conPropuesta.size,
      proposedHigh: propuestas.filter((p) => p.match === "ALTA").length,
      proposedPartial: propuestas.filter((p) => p.match === "PARCIAL").length,
      withoutCoverage: total - respondidas.size - propuestas.length,
      capabilitiesWithFindings: porCapacidad.filter((c) => c.findingsCount > 0).length,
    },
    capabilities: porCapacidad,
    proposals: propuestas,
    elapsedMs: Date.now() - inicio,
  };
}

export const confirmExpedienteProposalsInput = (data: unknown) =>
  z.object({
    items: z.array(z.object({ acquisitionId: z.string().min(1), evidenceId: z.string().uuid(), fragmentId: z.string().min(1) })).min(1).max(80),
  }).strict().parse(data);

/**
 * Confirmación humana agrupada: la persona hace suya la cita literal como
 * respuesta KNOWN con el documento como evidencia. El servidor vuelve a leer el
 * archivo y verifica la cita; nunca usa texto enviado por el cliente.
 */
export const confirmExpedienteBatchInput = (data: unknown) => z.object({
  items: z.array(z.object({ capabilityId: z.string().regex(/^[A-Z]{2}-\d{2}$/), acquisitionId: z.string().min(1), evidenceId: z.string().uuid(), fragmentId: z.string().min(1) }).strict()).min(1).max(80),
}).strict().parse(data);

export async function confirmExpedienteProposalsHandler(context: Ctx, capabilityId: string, data: ReturnType<typeof confirmExpedienteProposalsInput>) {
  const r = await confirmExpedienteBatchHandler(context, { items: data.items.map((i) => ({ ...i, capabilityId })) });
  return { ...r, capabilityId };
}

/** Una extracción por archivo/lote, validación independiente y lineage original por respuesta. */
export async function confirmExpedienteBatchHandler(context: Ctx, data: ReturnType<typeof confirmExpedienteBatchInput>) {
  const inicio = Date.now();
  const mapper = await import("./expediente-mapper");
  const casoUso = await import("./caso-uso");
  const runtime = await import("./runtime.server");
  const { expedienteBatchRepository } = await import("./expediente-batch-repository");
  const baseRepository = expedienteBatchRepository(runtime.createSupabaseProductionRepository());
  const { assessment, deps } = await prepararContexto(context, data.items[0]?.capabilityId ?? "", { baseRepository });
  const role = await deps.repository.getMembershipRole(assessment.organizationId, context.userId);
  if (role !== "OWNER" && role !== "ADMIN") throw new Error("OWNER_ADMIN_REQUIRED");
  const ids = [...new Set(data.items.map((i) => i.evidenceId))];
  const evidencias = (await deps.repository.listEvidence(assessment.id)).filter((e) => ids.includes(e.id) && e.organizationId === assessment.organizationId && e.assessmentId === assessment.id);
  if (evidencias.length !== ids.length) throw new Error("EVIDENCE_NOT_IN_ASSESSMENT");
  const docs = await leerExpediente(context, evidencias);
  const fragmentos = [...docs.values()].flatMap((d) => d.fragments);
  const { getRegisteredPack, OFFICIAL_CAPABILITY_IDS } = await import("./packs-registry");
  const catalogo = OFFICIAL_CAPABILITY_IDS.flatMap((id) => mapper.catalogoDePack(id, getRegisteredPack(id).pack));
  // Recalcular con el catálogo transversal completo: no aceptar un fragmento arbitrario ni el texto del cliente.
  const propuestas = new Map(mapper.proponerCorrespondencias(catalogo, fragmentos, new Set()).map((p) => [`${p.capabilityId}::${p.acquisitionId}`, p]));
  const resultados: { capabilityId: string; acquisitionId: string; accepted: boolean; reason: string | null; responseId: string | null; observationId: string | null; evaluationRunId: string | null }[] = [];
  const grupos = new Map<string, typeof data.items>();
  const vistas = new Set<string>();
  for (const item of data.items) {
    const key = `${item.capabilityId}::${item.acquisitionId}`;
    if (vistas.has(key)) continue;
    vistas.add(key);
    grupos.set(item.capabilityId, [...(grupos.get(item.capabilityId) ?? []), item]);
  }
  // Dos escrituras/evaluaciones en paralelo: cada evaluación usa hasta cuatro lecturas.
  // Conservador: una capacidad a la vez, y dos invocaciones desde el navegador.
  for (const [capabilityId, items] of grupos) {
    const scoped = capabilityId === deps.engine.pack.capability.id ? { assessment, deps } : await prepararContexto(context, capabilityId, { baseRepository, resolverAssessment: async () => assessment });
    if (scoped.assessment.id !== assessment.id || scoped.assessment.organizationId !== assessment.organizationId) throw new Error("ASSESSMENT_SCOPE_MISMATCH");
    const vigentes = new Set((await casoUso.evaluarCapacidad(scoped.deps, assessment.id))?.answeredAcquisitionIds ?? []);
    const respondent = await asegurarRespondentPropio(scoped.deps, { organizationId: assessment.organizationId, assessmentId: assessment.id, capabilityId, userId: context.userId });
    const inicioResultados = resultados.length;
    for (const item of items) {
      const p = propuestas.get(`${capabilityId}::${item.acquisitionId}`);
      const baseResult = { capabilityId, acquisitionId: item.acquisitionId, responseId: null, observationId: null, evaluationRunId: null };
      if (vigentes.has(item.acquisitionId)) { resultados.push({ ...baseResult, accepted: false, reason: "ALREADY_ANSWERED" }); continue; }
      if (!p || p.evidenceId !== item.evidenceId || p.fragmentId !== item.fragmentId) { resultados.push({ ...baseResult, accepted: false, reason: "PROPOSAL_NOT_VERIFIED" }); continue; }
      try {
        const r = await casoUso.submitAcquisitionResponse(scoped.deps, {
          assessmentId: assessment.id, organizationId: assessment.organizationId, submittedBy: context.userId,
          respondentId: respondent.respondent.id, acquisitionId: item.acquisitionId, knowledgeState: "KNOWN", semanticValue: p.quote,
          notApplicableReason: null, evidenceIds: [item.evidenceId],
          rawInput: { origin: "EXPEDIENTE_DOCUMENTAL", mapperVersion: mapper.VERSION_MAPEADOR_EXPEDIENTE, evidenceId: item.evidenceId,
            fragmentId: p.fragmentId, page: p.page, section: p.section, quote: p.quote, confirmedByUserId: context.userId,
            note: "Cita literal confirmada por la persona; no es interpretación ni suficiencia." },
        }, { deferEvaluation: true });
        if (r.accepted) vigentes.add(item.acquisitionId);
        resultados.push({ ...baseResult, accepted: r.accepted, reason: r.accepted ? null : r.rejectionReason ?? "REJECTED", responseId: r.responseId, observationId: r.observationId, evaluationRunId: r.evaluationRunId });
      } catch { resultados.push({ ...baseResult, accepted: false, reason: "SAVE_FAILED_REFRESH_BEFORE_RETRY" }); }
    }
    const aceptadas = resultados.slice(inicioResultados).filter((r) => r.accepted);
    if (aceptadas.length) {
      const evaluacion = await casoUso.reevaluarTrasCambioDocumental(scoped.deps, { assessmentId: assessment.id, organizationId: assessment.organizationId, trigger: "OBSERVATION_UPDATED" });
      for (const r of aceptadas) r.evaluationRunId = evaluacion.evaluationRunId;
    }
  }
  return { confirmed: resultados.filter((r) => r.accepted).length, results: resultados, elapsedMs: Date.now() - inicio };
}
