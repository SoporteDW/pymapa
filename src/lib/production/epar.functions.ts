import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { eparScopeSchema, eparSaveSchema, eparReviewSchema, professionalGrantSchema } from "./epar-contract";

export const getProfessionalWorkspace = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => eparScopeSchema.parse(d)).handler(async ({ data, context }) => {
  const h = await import("./epar.server");
  return h.getEparWorkspace(context.supabase as never, context.userId, data);
});
export const registerProfessionalAssessment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => eparSaveSchema.parse(d)).handler(async ({ data, context }) => {
  const h = await import("./epar.server");
  return h.saveEpar(context.supabase as never, context.userId, data, data.body);
});
export const reviewProfessionalAssessment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => eparReviewSchema.parse(d)).handler(async ({ data, context }) => {
  const h = await import("./epar.server");
  return h.reviewEpar(context.supabase as never, context.userId, data, data);
});

// Governance account designation is provisioned only through an explicit external mandate.
// No role inference, admin client, self-service bootstrap or default issuer.
export const grantProfessionalAuthority = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => professionalGrantSchema.parse(d)).handler(async ({ data, context }) => {
  const { getRegisteredPack } = await import("./packs-registry");
  for (const id of data.capabilityIds) getRegisteredPack(id);
  const db = context.supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: string | null; error: unknown }> };
  const r = await db.rpc("grant_professional_authority", { _organization: data.organizationId, _evaluator: data.userId, _assessment: data.assessmentId, _capabilities: data.capabilityIds, _from: data.validFrom, _until: data.validUntil, _approval: data.approvalReference });
  if (r.error) throw new Error("EPAR_GOVERNANCE_DENIED");
  return r.data;
});
export const revokeProfessionalAuthority = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ authorityId: z.string().uuid(), note: z.string().trim().min(1).max(8000) }).parse(d)).handler(async ({ data, context }) => {
  const db = context.supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: string | null; error: unknown }> };
  const r = await db.rpc("revoke_professional_authority", { _authority: data.authorityId, _note: data.note });
  if (r.error) throw new Error("EPAR_GOVERNANCE_DENIED");
  return r.data;
});