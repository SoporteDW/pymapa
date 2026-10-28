/**
 * PYM-NOV-MVP31 · Boundary autenticado del Plan de Transformación (RLS como el usuario).
 * Lectura: proyección pura de hallazgos CONFIRMED + análisis asistido vigente.
 * Decisión: append-only, solo OWNER/ADMIN, nota obligatoria; MODIFIED exige texto.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consolidarPlanTransformacion } from "./transformation-plan";

const decisionSchema = z.object({
  proposalKey: z.string().regex(/^(FINDING|AI):/, "PROPOSAL_KEY_INVALID"),
  decision: z.enum(["ACCEPTED", "MODIFIED", "DISCARDED"]),
  note: z.string().trim().min(3, "NOTE_REQUIRED").max(1000),
  modifiedAction: z.string().trim().min(3).max(1000).nullable().optional(),
});

export const getTransformationPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const runtime = await import("./runtime.server");
    const { listPublishedCapabilities } = await import("./packs-registry");
    const db = context.supabase;
    const assessment = await runtime.asegurarContextoProductivo(db as Parameters<typeof runtime.asegurarContextoProductivo>[0], context.userId);
    const org = assessment.organizationId;
    const m = await db.from("memberships").select("role").eq("organization_id", org).eq("user_id", context.userId).maybeSingle();
    if (m.error || !m.data) throw new Error("MEMBERSHIP_REQUIRED");

    const [fnd, ana, dec] = await Promise.all([
      db.from("findings").select("id, organization_id, capability_id, finding_ref, polarity, lifecycle_state, detail, created_at").eq("organization_id", org).eq("lifecycle_state", "CONFIRMED"),
      db.from("ai_assisted_analyses").select("id, organization_id, capability_id, contract_version, model, items, created_at").eq("organization_id", org),
      db.from("transformation_decisions").select("organization_id, proposal_key, decision, modified_action, note, created_at").eq("organization_id", org),
    ]);
    for (const r of [fnd, ana, dec]) if (r.error) throw new Error(`TRANSFORMATION_PLAN_READ_FAILED: ${r.error.message}`);

    const analysisIds = (ana.data ?? []).map((a) => a.id);
    const rev = analysisIds.length
      ? await db.from("ai_assisted_analysis_reviews").select("analysis_id, item_id, decision").in("analysis_id", analysisIds)
      : { data: [], error: null };
    if (rev.error) throw new Error(`TRANSFORMATION_PLAN_READ_FAILED: ${rev.error.message}`);

    const catalogo = listPublishedCapabilities().map((c) => ({ capabilityId: c.capabilityId, name: c.name, domainId: c.domainId }));
    const plan = consolidarPlanTransformacion(org, catalogo, {
      findings: (fnd.data ?? []) as never,
      analyses: (ana.data ?? []) as never,
      reviews: (rev.data ?? []) as never,
      decisions: (dec.data ?? []) as never,
    });
    const role = m.data.role as string;
    return { ...plan, role, canDecide: role === "OWNER" || role === "ADMIN" };
  });

export const decidirPropuestaTransformacion = createServerFn({ method: "POST" })
  .inputValidator((input: { proposalKey: string; decision: DecisionPropuesta; note: string; modifiedAction?: string | null }) => {
    if (!input || typeof input.proposalKey !== "string" || !/^(FINDING|AI):/.test(input.proposalKey)) throw new Error("PROPOSAL_KEY_INVALID");
    if (!DECISIONES.includes(input.decision)) throw new Error("DECISION_INVALID");
    if (typeof input.note !== "string" || input.note.trim().length < 3) throw new Error("NOTE_REQUIRED");
    if (input.decision === "MODIFIED" && (typeof input.modifiedAction !== "string" || input.modifiedAction.trim().length < 3)) {
      throw new Error("MODIFIED_ACTION_REQUIRED");
    }
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const runtime = await import("./runtime.server");
    const db = context.supabase;
    const assessment = await runtime.asegurarContextoProductivo(db as Parameters<typeof runtime.asegurarContextoProductivo>[0], context.userId);
    const org = assessment.organizationId;
    // La política RLS de inserción exige OWNER/ADMIN y decided_by = auth.uid();
    // aquí solo se registra la decisión, append-only.
    const ins = await db.from("transformation_decisions").insert({
      organization_id: org,
      proposal_key: data.proposalKey,
      decision: data.decision,
      modified_action: data.decision === "MODIFIED" ? data.modifiedAction!.trim() : null,
      note: data.note.trim(),
      decided_by: context.userId,
    });
    if (ins.error) throw new Error(`TRANSFORMATION_DECISION_REJECTED: ${ins.error.message}`);
    return { ok: true as const };
  });
