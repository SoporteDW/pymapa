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
    return casoUso.submitAcquisitionResponse(deps, {
      assessmentId: assessment.id,
      organizationId: assessment.organizationId,
      submittedBy: context.userId,
      acquisitionId: data.acquisitionId,
      knowledgeState: data.knowledgeState,
      semanticValue: data.semanticValue ?? null,
      notApplicableReason: data.notApplicableReason ?? null,
      ...(data.conflictingObservationIds
        ? { conflictingObservationIds: data.conflictingObservationIds }
        : {}),
      ...(data.rawInput ? { rawInput: data.rawInput } : {}),
    });
  });
