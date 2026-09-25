/**
 * Application boundary del vertical OP-01 (M1-D · compatibilidad PKG-01).
 *
 * Superficie pública OP-01 preservada: cada función delega en el handler
 * genérico con capabilityId = "OP-01". El runtime server-only se carga de
 * forma dinámica dentro de los handlers (await import("./runtime.server")).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as h from "./capability-handlers";

const OP01 = "OP-01";

export const getOp01Context = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => h.getCapabilityContextHandler(context, OP01, {}));

export const getOp01AssessmentState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => h.getCapabilityAssessmentStateHandler(context, OP01, {}));

export const getOp01NextAcquisition = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => h.getCapabilityNextAcquisitionHandler(context, OP01, {}));

export const submitOp01Response = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.submitCapabilityResponseInput(data))
  .handler(async ({ data, context }) => h.submitCapabilityResponseHandler(context, OP01, data));

export const getOp01Collaboration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => h.getCapabilityCollaborationHandler(context, OP01, {}));

export const inviteOp01Respondent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.inviteCapabilityRespondentInput(data))
  .handler(async ({ data, context }) => h.inviteCapabilityRespondentHandler(context, OP01, data));

export const registerOp01Evidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.registerCapabilityEvidenceInput(data))
  .handler(async ({ data, context }) => h.registerCapabilityEvidenceHandler(context, OP01, data));

export const getOp01Findings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => h.getCapabilityFindingsHandler(context, OP01, {}));

export const reviewOp01Finding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.reviewCapabilityFindingInput(data))
  .handler(async ({ data, context }) => h.reviewCapabilityFindingHandler(context, OP01, data));

export const createOp01RecommendationCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.createCapabilityRecommendationCandidateInput(data))
  .handler(async ({ data, context }) => h.createCapabilityRecommendationCandidateHandler(context, OP01, data));

export const decideOp01Recommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.decideCapabilityRecommendationInput(data))
  .handler(async ({ data, context }) => h.decideCapabilityRecommendationHandler(context, OP01, data));

export const createOp01Intervention = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.createCapabilityInterventionInput(data))
  .handler(async ({ data, context }) => h.createCapabilityInterventionHandler(context, OP01, data));

export const createOp01Activity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.createCapabilityActivityInput(data))
  .handler(async ({ data, context }) => h.createCapabilityActivityHandler(context, OP01, data));

export const changeOp01ActivityState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.changeCapabilityActivityStateInput(data))
  .handler(async ({ data, context }) => h.changeCapabilityActivityStateHandler(context, OP01, data));

export const registerOp01Deliverable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.registerCapabilityDeliverableInput(data))
  .handler(async ({ data, context }) => h.registerCapabilityDeliverableHandler(context, OP01, data));

export const markOp01ActivityDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.markCapabilityActivityDoneInput(data))
  .handler(async ({ data, context }) => h.markCapabilityActivityDoneHandler(context, OP01, data));

export const registerOp01ValidationRequirement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.registerCapabilityValidationRequirementInput(data))
  .handler(async ({ data, context }) => h.registerCapabilityValidationRequirementHandler(context, OP01, data));

export const registerOp01ValidationCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.registerCapabilityValidationCaseInput(data))
  .handler(async ({ data, context }) => h.registerCapabilityValidationCaseHandler(context, OP01, data));

export const openOp01Validation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.openCapabilityValidationInput(data))
  .handler(async ({ data, context }) => h.openCapabilityValidationHandler(context, OP01, data));

export const decideOp01Validation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.decideCapabilityValidationInput(data))
  .handler(async ({ data, context }) => h.decideCapabilityValidationHandler(context, OP01, data));

export const startOp01FollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.startCapabilityFollowUpInput(data))
  .handler(async ({ data, context }) => h.startCapabilityFollowUpHandler(context, OP01, data));

export const decideOp01FollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.decideCapabilityFollowUpInput(data))
  .handler(async ({ data, context }) => h.decideCapabilityFollowUpHandler(context, OP01, data));

export const startOp01Reassessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.startCapabilityReassessmentInput(data))
  .handler(async ({ data, context }) => h.startCapabilityReassessmentHandler(context, OP01, data));

export const compareOp01Assessments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.compareCapabilityAssessmentsInput(data))
  .handler(async ({ data, context }) => h.compareCapabilityAssessmentsHandler(context, OP01, data));

export const getOp01Validation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => h.getCapabilityValidationHandler(context, OP01, {}));

