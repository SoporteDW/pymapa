/**
 * PKG-01 · Application boundary genérico para las 31 capacidades publicadas.
 * Toda función exige sesión y un capabilityId publicado (fail-closed).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as h from "./capability-handlers";

const capabilityIdSchema = z.string().regex(/^[A-Z]{2}-\d{2}$/);
const conCapacidad = z.object({ capabilityId: capabilityIdSchema }).passthrough();

function separar(data: unknown) {
  const { capabilityId, ...resto } = conCapacidad.parse(data);
  return { capabilityId, resto };
}

/** Catálogo gobernado de las capacidades publicadas (identidad de fuente). */
export const listAvailableCapabilities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const runtime = await import("./runtime.server");
    return {
      runtimeManifest: {
        identifier: runtime.KNOWLEDGE_RUNTIME_IDENTIFIER,
        version: runtime.KNOWLEDGE_RUNTIME_VERSION,
      },
      capabilities: runtime.listarCapacidadesDisponibles(),
    };
  });

export const getCapabilityContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ({ capabilityId: separar(data).capabilityId }))
  .handler(async ({ data, context }) => h.getCapabilityContextHandler(context, data.capabilityId, {}));

export const getCapabilityAssessmentState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ({ capabilityId: separar(data).capabilityId }))
  .handler(async ({ data, context }) => h.getCapabilityAssessmentStateHandler(context, data.capabilityId, {}));

export const getCapabilityNextAcquisition = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ({ capabilityId: separar(data).capabilityId }))
  .handler(async ({ data, context }) => h.getCapabilityNextAcquisitionHandler(context, data.capabilityId, {}));

export const submitCapabilityResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.submitCapabilityResponseInput(resto) };
  })
  .handler(async ({ data, context }) => h.submitCapabilityResponseHandler(context, data.capabilityId, data.input));

export const getCapabilityCollaboration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ({ capabilityId: separar(data).capabilityId }))
  .handler(async ({ data, context }) => h.getCapabilityCollaborationHandler(context, data.capabilityId, {}));

export const inviteCapabilityRespondent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.inviteCapabilityRespondentInput(resto) };
  })
  .handler(async ({ data, context }) => h.inviteCapabilityRespondentHandler(context, data.capabilityId, data.input));

export const registerCapabilityEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.registerCapabilityEvidenceInput(resto) };
  })
  .handler(async ({ data, context }) => h.registerCapabilityEvidenceHandler(context, data.capabilityId, data.input));

export const getCapabilityFindings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ({ capabilityId: separar(data).capabilityId }))
  .handler(async ({ data, context }) => h.getCapabilityFindingsHandler(context, data.capabilityId, {}));

export const reviewCapabilityFinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.reviewCapabilityFindingInput(resto) };
  })
  .handler(async ({ data, context }) => h.reviewCapabilityFindingHandler(context, data.capabilityId, data.input));

export const createCapabilityRecommendationCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.createCapabilityRecommendationCandidateInput(resto) };
  })
  .handler(async ({ data, context }) => h.createCapabilityRecommendationCandidateHandler(context, data.capabilityId, data.input));

export const decideCapabilityRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.decideCapabilityRecommendationInput(resto) };
  })
  .handler(async ({ data, context }) => h.decideCapabilityRecommendationHandler(context, data.capabilityId, data.input));

export const createCapabilityIntervention = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.createCapabilityInterventionInput(resto) };
  })
  .handler(async ({ data, context }) => h.createCapabilityInterventionHandler(context, data.capabilityId, data.input));

export const createCapabilityActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.createCapabilityActivityInput(resto) };
  })
  .handler(async ({ data, context }) => h.createCapabilityActivityHandler(context, data.capabilityId, data.input));

export const changeCapabilityActivityState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.changeCapabilityActivityStateInput(resto) };
  })
  .handler(async ({ data, context }) => h.changeCapabilityActivityStateHandler(context, data.capabilityId, data.input));

export const registerCapabilityDeliverable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.registerCapabilityDeliverableInput(resto) };
  })
  .handler(async ({ data, context }) => h.registerCapabilityDeliverableHandler(context, data.capabilityId, data.input));

export const markCapabilityActivityDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.markCapabilityActivityDoneInput(resto) };
  })
  .handler(async ({ data, context }) => h.markCapabilityActivityDoneHandler(context, data.capabilityId, data.input));

export const registerCapabilityValidationRequirement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.registerCapabilityValidationRequirementInput(resto) };
  })
  .handler(async ({ data, context }) => h.registerCapabilityValidationRequirementHandler(context, data.capabilityId, data.input));

export const registerCapabilityValidationCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.registerCapabilityValidationCaseInput(resto) };
  })
  .handler(async ({ data, context }) => h.registerCapabilityValidationCaseHandler(context, data.capabilityId, data.input));

export const openCapabilityValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.openCapabilityValidationInput(resto) };
  })
  .handler(async ({ data, context }) => h.openCapabilityValidationHandler(context, data.capabilityId, data.input));

export const decideCapabilityValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.decideCapabilityValidationInput(resto) };
  })
  .handler(async ({ data, context }) => h.decideCapabilityValidationHandler(context, data.capabilityId, data.input));

export const startCapabilityFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.startCapabilityFollowUpInput(resto) };
  })
  .handler(async ({ data, context }) => h.startCapabilityFollowUpHandler(context, data.capabilityId, data.input));

export const decideCapabilityFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.decideCapabilityFollowUpInput(resto) };
  })
  .handler(async ({ data, context }) => h.decideCapabilityFollowUpHandler(context, data.capabilityId, data.input));

export const startCapabilityReassessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.startCapabilityReassessmentInput(resto) };
  })
  .handler(async ({ data, context }) => h.startCapabilityReassessmentHandler(context, data.capabilityId, data.input));

export const compareCapabilityAssessments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const { capabilityId, resto } = separar(data);
    return { capabilityId, input: h.compareCapabilityAssessmentsInput(resto) };
  })
  .handler(async ({ data, context }) => h.compareCapabilityAssessmentsHandler(context, data.capabilityId, data.input));

export const getCapabilityValidation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ({ capabilityId: separar(data).capabilityId }))
  .handler(async ({ data, context }) => h.getCapabilityValidationHandler(context, data.capabilityId, {}));

