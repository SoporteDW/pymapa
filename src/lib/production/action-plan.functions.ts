/** PYM-BETA-INT-01-ACT · Boundary autenticado del Plan de Acción (RLS como el usuario). */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCompanyActionPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const runtime = await import("./runtime.server");
    const { consolidarPlanDeAccion } = await import("./action-plan");
    const db = context.supabase;
    const assessment = await runtime.asegurarContextoProductivo(db as Parameters<typeof runtime.asegurarContextoProductivo>[0], context.userId);
    const org = assessment.organizationId;
    const m = await db.from("memberships").select("role").eq("organization_id", org).eq("user_id", context.userId).maybeSingle();
    if (m.error || !m.data) throw new Error("MEMBERSHIP_REQUIRED");
    const [itv, act, del] = await Promise.all([
      db.from("interventions").select("id, organization_id, finding_id, title, status, created_at").eq("organization_id", org),
      db.from("activities").select("id, organization_id, intervention_id, title, state, responsible_label, due_date, done_at, created_at").eq("organization_id", org),
      db.from("deliverables").select("id, organization_id, activity_id, title, registered_at").eq("organization_id", org),
    ]);
    for (const r of [itv, act, del]) if (r.error) throw new Error(`ACTION_PLAN_READ_FAILED: ${r.error.message}`);
    const findingIds = [...new Set((itv.data ?? []).map((i) => i.finding_id).filter((x): x is string => !!x))];
    const fnd = findingIds.length
      ? await db.from("findings").select("id, organization_id, capability_id, finding_ref, lifecycle_state, detail").eq("organization_id", org).in("id", findingIds)
      : { data: [], error: null };
    if (fnd.error) throw new Error(`ACTION_PLAN_READ_FAILED: ${fnd.error.message}`);
    const plan = consolidarPlanDeAccion(org, {
      interventions: itv.data ?? [],
      activities: (act.data ?? []) as never,
      deliverables: del.data ?? [],
      findings: (fnd.data ?? []) as never,
    });
    const role = m.data.role as string;
    return { ...plan, role, canManage: role === "OWNER" || role === "ADMIN" };
  });
