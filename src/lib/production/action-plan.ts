/**
 * PYM-BETA-INT-01-ACT · Consolidación pura del Plan de Acción empresarial.
 * Solo proyecta filas persistidas (interventions/activities/deliverables/findings);
 * no crea recomendaciones, no infiere estados y no es una segunda fuente de verdad.
 */
export interface FilaIntervencion { id: string; organization_id: string; finding_id: string | null; title: string; status: string; created_at: string }
export interface FilaActividad { id: string; organization_id: string; intervention_id: string; title: string; state: string; responsible_label: string | null; due_date: string | null; done_at: string | null; created_at: string }
export interface FilaEntregable { id: string; organization_id: string; activity_id: string; title: string; registered_at: string }
export interface FilaHallazgo { id: string; organization_id: string; capability_id: string; finding_ref: string; lifecycle_state: string; detail: Record<string, unknown> | null }

export interface ActividadPlan {
  id: string;
  title: string;
  state: string;
  responsibleLabel: string | null;
  dueDate: string | null;
  doneAt: string | null;
  capabilityId: string | null;
  finding: { id: string; ref: string; name: string; lifecycleState: string } | null;
  intervention: { id: string; title: string; status: string };
  deliverables: { id: string; title: string; registeredAt: string }[];
}

export function consolidarPlanDeAccion(
  organizationId: string,
  filas: { interventions: FilaIntervencion[]; activities: FilaActividad[]; deliverables: FilaEntregable[]; findings: FilaHallazgo[] },
) {
  // Aislamiento defensivo además de RLS: se descarta cualquier fila ajena.
  const deOrg = <T extends { organization_id: string }>(xs: T[]) => xs.filter((x) => x.organization_id === organizationId);
  const intervenciones = new Map(deOrg(filas.interventions).map((i) => [i.id, i]));
  const hallazgos = new Map(deOrg(filas.findings).map((f) => [f.id, f]));
  const vistas = new Set<string>();
  const activities: ActividadPlan[] = [];
  for (const a of deOrg(filas.activities)) {
    const itv = intervenciones.get(a.intervention_id);
    if (!itv || vistas.has(a.id)) continue;
    vistas.add(a.id);
    const f = itv.finding_id ? hallazgos.get(itv.finding_id) ?? null : null;
    activities.push({
      id: a.id,
      title: a.title,
      state: a.state,
      responsibleLabel: a.responsible_label,
      dueDate: a.due_date,
      doneAt: a.done_at,
      capabilityId: f?.capability_id ?? null,
      finding: f ? { id: f.id, ref: f.finding_ref, name: (f.detail?.["name"] as string | undefined) ?? f.finding_ref, lifecycleState: f.lifecycle_state } : null,
      intervention: { id: itv.id, title: itv.title, status: itv.status },
      deliverables: deOrg(filas.deliverables)
        .filter((d) => d.activity_id === a.id)
        .map((d) => ({ id: d.id, title: d.title, registeredAt: d.registered_at })),
    });
  }
  activities.sort((x, y) => (x.capabilityId ?? "~").localeCompare(y.capabilityId ?? "~") || x.title.localeCompare(y.title));
  const porEstado: Record<string, number> = {};
  for (const a of activities) porEstado[a.state] = (porEstado[a.state] ?? 0) + 1;
  return {
    activities,
    summary: { total: activities.length, byState: porEstado, capabilities: new Set(activities.map((a) => a.capabilityId).filter(Boolean)).size },
  };
}
