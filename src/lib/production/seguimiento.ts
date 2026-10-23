/**
 * PYM-BETA-INT-02-SEG · Consolidación pura del Seguimiento empresarial.
 * Proyecta actividades validadas o en seguimiento con sus validaciones y
 * follow-ups persistidos. Sin scoring, sin indicadores ni reevaluaciones:
 * las transiciones solo ocurren vía contratos de `caso-uso.ts`.
 */
import { consolidarPlanDeAccion, type ActividadPlan, type FilaActividad, type FilaEntregable, type FilaHallazgo, type FilaIntervencion } from "./action-plan";

export interface FilaValidacion { id: string; organization_id: string; activity_id: string | null; status: string; decision_reason: string | null; reviewed_at: string | null; created_at: string }
export interface FilaFollowUp { id: string; organization_id: string; activity_id: string; validation_id: string; status: string; note: string | null; decided_at: string | null; created_at: string }

export const ESTADOS_SEGUIMIENTO = ["VALIDATED", "FOLLOW_UP", "CONSOLIDATED", "NEEDS_ADJUSTMENT"] as const;

export interface ActividadSeguimiento extends ActividadPlan {
  validation: { id: string; status: string; reason: string | null; reviewedAt: string | null } | null;
  followUps: { id: string; status: string; note: string | null; decidedAt: string | null; createdAt: string }[];
  /** VALIDATED con validación VALIDATED y sin seguimiento abierto. */
  canStartFollowUp: boolean;
  openFollowUpId: string | null;
}

export function consolidarSeguimiento(
  organizationId: string,
  filas: {
    interventions: FilaIntervencion[];
    activities: FilaActividad[];
    deliverables: FilaEntregable[];
    findings: FilaHallazgo[];
    validations: FilaValidacion[];
    followUps: FilaFollowUp[];
  },
) {
  const plan = consolidarPlanDeAccion(organizationId, filas);
  const deOrg = <T extends { organization_id: string }>(xs: T[]) => xs.filter((x) => x.organization_id === organizationId);
  const validaciones = deOrg(filas.validations);
  const seguimientos = deOrg(filas.followUps);
  const activities: ActividadSeguimiento[] = plan.activities
    .filter((a) => (ESTADOS_SEGUIMIENTO as readonly string[]).includes(a.state))
    .map((a) => {
      const vs = validaciones.filter((v) => v.activity_id === a.id).sort((x, y) => y.created_at.localeCompare(x.created_at));
      const v = vs.find((x) => x.status === "VALIDATED") ?? vs[0] ?? null;
      const fus = seguimientos.filter((f) => f.activity_id === a.id).sort((x, y) => x.created_at.localeCompare(y.created_at));
      const abierto = fus.find((f) => f.status === "OPEN") ?? null;
      return {
        ...a,
        validation: v ? { id: v.id, status: v.status, reason: v.decision_reason, reviewedAt: v.reviewed_at } : null,
        followUps: fus.map((f) => ({ id: f.id, status: f.status, note: f.note, decidedAt: f.decided_at, createdAt: f.created_at })),
        canStartFollowUp: a.state === "VALIDATED" && v?.status === "VALIDATED" && !abierto,
        openFollowUpId: abierto?.id ?? null,
      };
    });
  const porEstado: Record<string, number> = {};
  for (const a of activities) porEstado[a.state] = (porEstado[a.state] ?? 0) + 1;
  return {
    activities,
    summary: { total: activities.length, byState: porEstado, capabilities: new Set(activities.map((a) => a.capabilityId).filter(Boolean)).size },
  };
}

export const ROLES_SEGUIMIENTO = ["OWNER", "ADMIN"] as const;
export function puedeGestionarSeguimiento(rol: string | null | undefined): boolean {
  return !!rol && (ROLES_SEGUIMIENTO as readonly string[]).includes(rol);
}
