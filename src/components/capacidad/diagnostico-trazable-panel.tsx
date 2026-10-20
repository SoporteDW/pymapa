/**
 * MVP-BETA-INT-01 · Diagnóstico trazable en tres capas separadas:
 *  1. Hallazgos producidos por el motor (con reglas, datos y citas).
 *  2. Recomendaciones gobernadas (solo si existen con contenido y vínculo).
 *  3. Acciones formuladas por el equipo (nunca presentadas como del motor).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  changeCapabilityActivityState,
  createCapabilityActivity,
  createCapabilityIntervention,
  getCapabilityFindings,
  registerCapabilityDeliverable,
  reviewCapabilityFinding,
} from "@/lib/production/capabilities.functions";

const CICLO: Record<string, string> = {
  CANDIDATE: "Propuesto por el motor",
  NEEDS_REVIEW: "Pendiente de revisión humana",
  CONFIRMED: "Confirmado por la empresa",
  DISMISSED: "Descartado por la empresa",
  SUPERSEDED: "Ya no vigente",
};
const ACTIVIDAD: Record<string, string> = { PENDING: "Pendiente", EXECUTING: "En curso", DELIVERABLE_PRODUCED: "Entregable producido" };

/** Una recomendación es gobernada solo con contenido y vínculo gobernado. */
export function esRecomendacionGobernada(r: { title: string | null; mappingStatus: string; contentStatus: string }): boolean {
  return Boolean(r.title) && r.mappingStatus !== "NOT_GOVERNED" && !r.contentStatus.startsWith("NOT_EXPLICIT");
}

export function DiagnosticoTrazablePanel({ capabilityId, canGovern }: { capabilityId: string; canGovern: boolean }) {
  const qc = useQueryClient();
  const cargar = useServerFn(getCapabilityFindings);
  const revisarFn = useServerFn(reviewCapabilityFinding);
  const intervencionFn = useServerFn(createCapabilityIntervention);
  const actividadFn = useServerFn(createCapabilityActivity);
  const estadoFn = useServerFn(changeCapabilityActivityState);
  const entregableFn = useServerFn(registerCapabilityDeliverable);
  const q = useQuery({ queryKey: ["capacidad", capabilityId, "hallazgos"], queryFn: () => cargar({ data: { capabilityId } }), retry: false });
  const [formFinding, setFormFinding] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [actividad, setActividad] = useState("");
  const [responsable, setResponsable] = useState("");
  const [plazo, setPlazo] = useState("");
  const [entregable, setEntregable] = useState<Record<string, string>>({});

  const refrescar = async () => {
    await qc.invalidateQueries({ queryKey: ["capacidad", capabilityId] });
    await qc.invalidateQueries({ queryKey: ["op01"] });
  };
  const ok = (msg: string) => async (r: { accepted: boolean; rejectionReason: string | null }) => {
    if (!r.accepted) { toast.error("No se aceptó la acción", { description: r.rejectionReason ?? undefined }); return; }
    toast.success(msg);
    await refrescar();
  };
  const revisar = useMutation({
    mutationFn: (v: { findingId: string; decision: "CONFIRMED" | "DISMISSED" | "NEEDS_REVIEW" }) => revisarFn({ data: { capabilityId, ...v } }),
    onSuccess: ok("Revisión registrada"),
  });
  const crear = useMutation({
    mutationFn: async (findingId: string) => {
      const itv = await intervencionFn({ data: { capabilityId, title: titulo.trim(), findingId, selectionNote: `Acción formulada por el equipo (no es recomendación del motor): ${motivo.trim()}` } });
      if (!itv.accepted || !itv.interventionId) return itv;
      const act = await actividadFn({ data: { capabilityId, interventionId: itv.interventionId, title: actividad.trim(), responsibleLabel: responsable.trim() || null, dueDate: plazo || null } });
      return { accepted: act.accepted, rejectionReason: act.rejectionReason };
    },
    onSuccess: async (r) => {
      await ok("Acción registrada por tu equipo")(r);
      if (r.accepted) { setFormFinding(null); setTitulo(""); setMotivo(""); setActividad(""); setResponsable(""); setPlazo(""); }
    },
  });
  const estado = useMutation({
    mutationFn: (v: { activityId: string; state: "EXECUTING" | "DELIVERABLE_PRODUCED" }) => estadoFn({ data: { capabilityId, ...v } }),
    onSuccess: ok("Estado actualizado"),
  });
  const registrar = useMutation({
    mutationFn: (v: { activityId: string; title: string }) => entregableFn({ data: { capabilityId, ...v } }),
    onSuccess: ok("Entregable registrado (todavía sin validar)"),
  });

  if (!q.data) return null;
  const d = q.data;
  const vigentes = d.findings.filter((f) => f.lifecycleState !== "SUPERSEDED");
  const historicos = d.findings.filter((f) => f.lifecycleState === "SUPERSEDED");
  const gobernadas = d.recommendationIdentities.filter(esRecomendacionGobernada);
  const pendientes = d.findingsAwaitingResolution.items;

  return (
    <Card data-testid="diagnostico-trazable">
      <CardHeader>
        <CardTitle className="text-base">Diagnóstico de esta capacidad</CardTitle>
        <CardDescription>
          Separamos lo que produce el motor de conocimiento, lo que recomienda el conocimiento aprobado y lo que decide tu equipo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <section className="space-y-3" data-testid="capa-hallazgos">
          <h3 className="font-semibold">1 · Hallazgos producidos por el motor</h3>
          {vigentes.length === 0 ? (
            <p className="text-muted-foreground">El motor no ha producido hallazgos con la información disponible.</p>
          ) : vigentes.map((f) => (
            <article key={f.id} data-finding-ref={f.findingRef} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={f.polarity === "STRENGTH" ? "default" : "secondary"}>{f.polarity === "STRENGTH" ? "Fortaleza" : "Punto débil"}</Badge>
                <Badge variant="outline">{CICLO[f.lifecycleState] ?? f.lifecycleState}</Badge>
                <span className="font-medium">{f.findingRef} · {f.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">Gravedad: {f.severityQualitative && !f.severityQualitative.startsWith("NOT_") ? f.severityQualitative : "no definida en el conocimiento"}</p>
              <ul className="space-y-1 text-xs">
                {f.rules.map((r) => <li key={r.ruleRef}><span className="font-medium">Regla {r.ruleRef}</span>{r.classification === "GOVERNED_JUDGMENT" ? " (requiere juicio humano)" : ""}: {r.statement ?? "sin enunciado"}</li>)}
                {f.variables.map((v) => <li key={v.variableRef}>Dato {v.variableRef}{v.name ? ` · ${v.name}` : ""}</li>)}
              </ul>
              {f.support.length > 0 && (
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Sustento</p>
                  {f.support.map((s) => (
                    <div key={s.observationId} className="rounded-md bg-muted/50 p-2">
                      {s.origin === "DOCUMENT" ? (
                        <>Documento aceptado ({s.acquisitionRef}): «{s.document?.fragmentText ?? "fragmento no disponible"}»{s.document?.mappingStatus === "SUPERSEDED" ? " · revocado" : ""}</>
                      ) : (
                        <>Respuesta registrada ({s.acquisitionRef})</>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Motor {f.lineage.engineVersion} · {f.lineage.knowledgePackId}@{f.lineage.knowledgePackVersion}</p>
              {canGovern && f.lifecycleState !== "CONFIRMED" && f.lifecycleState !== "DISMISSED" && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={revisar.isPending} onClick={() => revisar.mutate({ findingId: f.id, decision: "CONFIRMED" })}>Confirmar hallazgo</Button>
                  <Button size="sm" variant="outline" disabled={revisar.isPending} onClick={() => revisar.mutate({ findingId: f.id, decision: "DISMISSED" })}>Descartar</Button>
                </div>
              )}
            </article>
          ))}
          {pendientes.length > 0 && (
            <div className="space-y-1">
              <p className="font-medium">Información faltante o por aclarar</p>
              {pendientes.map((p) => (
                <p key={p.findingRef} className="text-xs text-muted-foreground">
                  {p.findingRef}: {p.status === "BLOCKED_BY_CONTRADICTION" ? "hay información contradictoria" : p.status === "EXCLUDED_NOT_APPLICABLE" ? "no aplica" : "falta información"}
                  {p.resolutionAcquisitionRefs.length > 0 ? ` (${p.resolutionAcquisitionRefs.join(", ")})` : ""}
                </p>
              ))}
            </div>
          )}
          {historicos.length > 0 && <p className="text-xs text-muted-foreground">{historicos.length} hallazgos anteriores ya no vigentes se conservan en el historial.</p>}
        </section>

        <section className="space-y-2" data-testid="capa-recomendaciones">
          <h3 className="font-semibold">2 · Recomendaciones gobernadas</h3>
          {gobernadas.length === 0 ? (
            <p className="text-muted-foreground">
              No hay recomendaciones gobernadas aplicables en esta capacidad.
              {d.recommendationIdentities.length > 0 && ` El conocimiento registra ${d.recommendationIdentities.length} identidades sin contenido ni vínculo aprobado con los hallazgos, así que no se muestran como recomendación.`}
            </p>
          ) : gobernadas.map((r) => <p key={r.recommendationRef}>{r.recommendationRef} · {r.title}</p>)}
        </section>

        <section className="space-y-3" data-testid="capa-acciones">
          <h3 className="font-semibold">3 · Acciones formuladas por tu equipo</h3>
          <p className="text-xs text-muted-foreground">Estas acciones las decide la empresa. No son recomendaciones automáticas del motor.</p>
          {d.interventions.map((i) => (
            <article key={i.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Formulada por el equipo</Badge>
                <span className="font-medium">{i.title}</span>
              </div>
              {i.findingId && <p className="text-xs text-muted-foreground">Vinculada al hallazgo {d.findings.find((f) => f.id === i.findingId)?.findingRef ?? i.findingId}</p>}
              {i.activities.map((a) => (
                <div key={a.id} className="space-y-2 rounded-md bg-muted/50 p-2 text-xs">
                  <p><span className="font-medium">{a.title}</span> · {ACTIVIDAD[a.state] ?? a.state}</p>
                  <p>Responsable: {a.responsibleLabel ?? "sin definir"} · Plazo: {a.dueDate ?? "sin definir"}</p>
                  {a.deliverables.map((e) => <p key={e.id}>Entregable: {e.title} (sin validar)</p>)}
                  {canGovern && (
                    <div className="flex flex-wrap items-center gap-2">
                      {a.state === "PENDING" && <Button size="sm" variant="outline" onClick={() => estado.mutate({ activityId: a.id, state: "EXECUTING" })}>Marcar en curso</Button>}
                      <Input aria-label={`Entregable de ${a.title}`} className="h-8 max-w-56" placeholder="Nombre del entregable" value={entregable[a.id] ?? ""} onChange={(e) => setEntregable((s) => ({ ...s, [a.id]: e.target.value }))} />
                      <Button size="sm" variant="outline" disabled={!entregable[a.id]?.trim() || registrar.isPending} onClick={() => registrar.mutate({ activityId: a.id, title: entregable[a.id]!.trim() })}>Registrar entregable</Button>
                    </div>
                  )}
                </div>
              ))}
            </article>
          ))}
          {canGovern && vigentes.filter((f) => f.lifecycleState === "CONFIRMED").map((f) => (
            formFinding === f.id ? (
              <div key={f.id} className="space-y-2 rounded-lg border border-dashed border-border p-3">
                <p className="font-medium">Nueva acción para {f.findingRef} · {f.name}</p>
                <Label htmlFor="acc-titulo">Nombre de la acción</Label>
                <Input id="acc-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                <Label htmlFor="acc-motivo">Por qué la decide tu equipo</Label>
                <Textarea id="acc-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <Label htmlFor="acc-actividad">Primera actividad</Label>
                <Input id="acc-actividad" value={actividad} onChange={(e) => setActividad(e.target.value)} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><Label htmlFor="acc-resp">Responsable</Label><Input id="acc-resp" value={responsable} onChange={(e) => setResponsable(e.target.value)} /></div>
                  <div><Label htmlFor="acc-plazo">Plazo</Label><Input id="acc-plazo" type="date" value={plazo} onChange={(e) => setPlazo(e.target.value)} /></div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={crear.isPending || !titulo.trim() || !motivo.trim() || !actividad.trim()} onClick={() => crear.mutate(f.id)}>Registrar acción</Button>
                  <Button size="sm" variant="ghost" onClick={() => setFormFinding(null)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button key={f.id} size="sm" variant="outline" onClick={() => setFormFinding(f.id)}>Formular una acción para {f.findingRef}</Button>
            )
          ))}
          {vigentes.every((f) => f.lifecycleState !== "CONFIRMED") && d.interventions.length === 0 && (
            <p className="text-xs text-muted-foreground">Confirma un hallazgo para poder registrar una acción vinculada.</p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
