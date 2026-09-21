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
});

/** Carga runtime + repositorio + assessment pinneado del usuario autenticado. */
async function prepararContexto(userId: string) {
  const runtime = await import("./runtime.server");
  const engine = runtime.cargarEngineOp01();
  const repository = runtime.createSupabaseProductionRepository();
  const assessment = await runtime.asegurarAssessmentOp01(userId);
  return {
    assessment,
    deps: {
      engine,
      repository,
      knowledgeVersionId: assessment.knowledgeVersionId,
    },
  };
}

export const getOp01AssessmentState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context.userId);
    const state = await casoUso.getAssessmentState(deps, assessment.id);
    return { assessmentId: assessment.id, state };
  });

export const getOp01NextAcquisition = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context.userId);
    const acquisition = await casoUso.getNextAcquisition(deps, assessment.id);
    return { assessmentId: assessment.id, acquisition };
  });

export const submitOp01Response = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data, context }) => {
    const casoUso = await import("./caso-uso");
    const { assessment, deps } = await prepararContexto(context.userId);
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
