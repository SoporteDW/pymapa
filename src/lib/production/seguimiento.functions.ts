/**
 * PYM-BETA-INT-02-SEG · Boundary autenticado del Seguimiento empresarial.
 * Lectura con RLS como el usuario; las operaciones delegan en los contratos
 * existentes (`iniciarFollowUp`/`decidirFollowUp`) tras exigir OWNER/ADMIN.
 * La capacidad se deriva en servidor (actividad → intervención → hallazgo).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Db = { from: (t: string) => any };

async function contexto(db: Db, userId: string) {
  const runtime = await import("./runtime.server");
  const assessment = await runtime.asegurarContextoProductivo(db as Parameters<typeof runtime.asegurarContextoProductivo>[0], userId);
  const org = assessment.organizationId;
  const m = await db.from("memberships").select("role").eq("organization_id", org).eq("user_id", userId).maybeSingle();
  if (m.error || !m.data) throw new Error("MEMBERSHIP_REQUIRED");
  return { org, role: m.data.role as string };
}

async function capacidadDeActividad(db: Db, org: string, activityId: string): Promise<string> {
  const a = await db.from("activities").select("intervention_id").eq("organization_id", org).eq("id", activityId).maybeSingle();
  if (a.error || !a.data) throw new Error("FOLLOW_UP_SCOPE_FORBIDDEN");
  const i = await db.from("interventions").select("finding_id").eq("organization_id", org).eq("id", a.data.intervention_id).maybeSingle();
  if (i.error || !i.data?.finding_id) throw new Error("FOLLOW_UP_CAPABILITY_UNRESOLVED");
  const f = await db.from("findings").select("capability_id").eq("organization_id", org).eq("id", i.data.finding_id).maybeSingle();
  if (f.error || !f.data) throw new Error("FOLLOW_UP_CAPABILITY_UNRESOLVED");
  return f.data.capability_id as string;
}

export const getCompanySeguimiento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { consolidarSeguimiento, puedeGestionarSeguimiento } = await import("./seguimiento");
    const db = context.supabase as unknown as Db;
    const { org, role } = await contexto(db, context.userId);
    const [itv, act, del, val, fu] = await Promise.all([
      db.from("interventions").select("id, organization_id, finding_id, title, status, created_at").eq("organization_id", org),
      db.from("activities").select("id, organization_id, intervention_id, title, state, responsible_label, due_date, done_at, created_at").eq("organization_id", org),
      db.from("deliverables").select("id, organization_id, activity_id, title, registered_at").eq("organization_id", org),
      db.from("validations").select("id, organization_id, activity_id, status, decision_reason, reviewed_at, created_at").eq("organization_id", org),
      db.from("follow_ups").select("id, organization_id, activity_id, validation_id, status, note, decided_at, created_at").eq("organization_id", org),
    ]);
    for (const r of [itv, act, del, val, fu]) if (r.error) throw new Error(`SEGUIMIENTO_READ_FAILED: ${r.error.message}`);
    const findingIds = [...new Set(((itv.data ?? []) as { finding_id: string | null }[]).map((i) => i.finding_id).filter((x): x is string => !!x))];
    const fnd = findingIds.length
      ? await db.from("findings").select("id, organization_id, capability_id, finding_ref, lifecycle_state, detail").eq("organization_id", org).in("id", findingIds)
      : { data: [], error: null };
    if (fnd.error) throw new Error(`SEGUIMIENTO_READ_FAILED: ${fnd.error.message}`);
    const vista = consolidarSeguimiento(org, {
      interventions: itv.data ?? [],
      activities: act.data ?? [],
      deliverables: del.data ?? [],
      findings: fnd.data ?? [],
      validations: val.data ?? [],
      followUps: fu.data ?? [],
    });
    return { ...vista, role, canManage: puedeGestionarSeguimiento(role) };
  });

export const startCompanyFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ validationId: z.string().uuid(), note: z.string().trim().min(1).max(2000).nullable().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { puedeGestionarSeguimiento } = await import("./seguimiento");
    const db = context.supabase as unknown as Db;
    const { org, role } = await contexto(db, context.userId);
    if (!puedeGestionarSeguimiento(role)) throw new Error("FOLLOW_UP_ROLE_FORBIDDEN");
    const v = await db.from("validations").select("activity_id").eq("organization_id", org).eq("id", data.validationId).maybeSingle();
    if (v.error || !v.data?.activity_id) throw new Error("FOLLOW_UP_SCOPE_FORBIDDEN");
    const capabilityId = await capacidadDeActividad(db, org, v.data.activity_id);
    const h = await import("./capability-handlers");
    return h.startCapabilityFollowUpHandler(context as never, capabilityId, { validationId: data.validationId, note: data.note ?? null });
  });

export const decideCompanyFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      followUpId: z.string().uuid(),
      outcome: z.enum(["CONSOLIDATED", "NEEDS_ADJUSTMENT"]),
      // Nota obligatoria: la decisión exige provenance explicable.
      note: z.string().trim().min(1).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { puedeGestionarSeguimiento } = await import("./seguimiento");
    const db = context.supabase as unknown as Db;
    const { org, role } = await contexto(db, context.userId);
    if (!puedeGestionarSeguimiento(role)) throw new Error("FOLLOW_UP_ROLE_FORBIDDEN");
    const f = await db.from("follow_ups").select("activity_id, status").eq("organization_id", org).eq("id", data.followUpId).maybeSingle();
    if (f.error || !f.data) throw new Error("FOLLOW_UP_SCOPE_FORBIDDEN");
    if (f.data.status !== "OPEN") return { accepted: false, rejectionReason: "FOLLOW_UP_NOT_OPEN", followUp: null };
    const capabilityId = await capacidadDeActividad(db, org, f.data.activity_id);
    const h = await import("./capability-handlers");
    return h.decideCapabilityFollowUpHandler(context as never, capabilityId, { followUpId: data.followUpId, outcome: data.outcome, note: data.note, evidenceId: null });
  });
