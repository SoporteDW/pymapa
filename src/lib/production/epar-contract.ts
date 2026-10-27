import { z } from "zod";

export const EPAR_ORIGIN = "PROFESSIONAL_ASSESSMENT" as const;
export const EPAR_AUTHORITY = "AUTHORIZED_PROFESSIONAL_EVALUATOR" as const;
export const eparScopeSchema = z.object({ organizationId: z.string().uuid(), assessmentId: z.string().uuid(), capabilityId: z.string().regex(/^[A-Z]{2}-\d{2}$/) });
const text = z.string().trim().min(1).max(8000);
export const eparBodySchema = z.object({
  authorityId: z.string().uuid(),
  evaluationId: z.string().uuid().nullable().default(null),
  previousVersionId: z.string().uuid().nullable().default(null),
  state: z.enum(["SUBSTANTIATED", "INSUFFICIENT_INFORMATION", "CONTRADICTORY_INFORMATION", "NOT_APPLICABLE", "REVIEW_REQUIRED"]),
  conclusion: text.nullable().default(null),
  justification: text,
  limitations: text,
  uncertainty: text,
  pendingInformation: z.string().trim().max(8000),
  sources: text,
  sourceDate: z.string().datetime({ offset: true }),
  validUntil: z.string().datetime({ offset: true }),
  responseIds: z.array(z.string().uuid()).max(500),
  evidenceIds: z.array(z.string().uuid()).max(500),
}).superRefine((d, ctx) => {
  if (d.state === "SUBSTANTIATED" && (!d.conclusion || d.responseIds.length + d.evidenceIds.length === 0)) ctx.addIssue({ code: "custom", message: "EPAR_SUBSTANTIATION_REQUIRED" });
  if (["INSUFFICIENT_INFORMATION", "CONTRADICTORY_INFORMATION", "NOT_APPLICABLE"].includes(d.state) && d.conclusion !== null) ctx.addIssue({ code: "custom", message: "EPAR_ABSTENTION_HAS_NO_CONCLUSION" });
  if (Boolean(d.evaluationId) !== Boolean(d.previousVersionId)) ctx.addIssue({ code: "custom", message: "EPAR_PREVIOUS_VERSION_REQUIRED" });
});
export const eparSaveSchema = eparScopeSchema.extend({ body: eparBodySchema });
export const eparReviewSchema = eparScopeSchema.extend({ versionId: z.string().uuid(), authorityId: z.string().uuid(), decision: z.enum(["REVIEWED", "CHANGES_REQUESTED"]), note: text });
export const professionalGrantSchema = z.object({ organizationId: z.string().uuid(), userId: z.string().uuid(), assessmentId: z.string().uuid().nullable(), capabilityIds: z.array(z.string()).min(1).max(31), validFrom: z.string().datetime({ offset: true }), validUntil: z.string().datetime({ offset: true }), approvalReference: text });
export type ProfessionalAuthority = { id: string; organization_id: string; evaluator_user_id: string; assessment_id: string | null; capability_ids: string[]; valid_from: string; valid_until: string };
export function hasProfessionalAuthority(a: ProfessionalAuthority, scope: z.infer<typeof eparScopeSchema>, userId: string, revoked: boolean, now: number): boolean {
  return !revoked && a.organization_id === scope.organizationId && a.evaluator_user_id === userId && (a.assessment_id === null || a.assessment_id === scope.assessmentId) && a.capability_ids.includes(scope.capabilityId) && Date.parse(a.valid_from) <= now && now < Date.parse(a.valid_until);
}