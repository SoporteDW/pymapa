/**
 * PKG-02 · Experiencia genérica de capacidad (31 capacidades publicadas).
 * Todo estado accionable llega del servidor; aquí no hay lógica diagnóstica.
 */
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { AcquisitionRenderer } from "@/components/capacidad/acquisition-renderer";
import { AcquisitionInput, type AcquisitionAnswer } from "@/components/capacidad/acquisition-input";
import { EvidenciaPanel } from "@/components/capacidad/evidencia-panel";
import { ColaboracionPanel } from "@/components/capacidad/colaboracion-panel";
import { ETIQUETA_ESTADO } from "@/components/diagnostico/catalogo-capacidades";
import {
  getCapabilityCollaboration,
  getCapabilityWorkspace,
  submitCapabilityResponse,
} from "@/lib/production/capabilities.functions";
import type { ActionableAcquisition } from "@/lib/production/actionable";

const FORMATO = /^[A-Z]{2}-\d{2}$/;

export const Route = createFileRoute("/_authenticated/capacidad/$id")({
  beforeLoad: ({ params }) => {
    if (!FORMATO.test(params.id.toUpperCase())) throw notFound();
    // OP-01 conserva su experiencia Golden completa (contrato de ruta M1).
    if (params.id.toUpperCase() === "OP-01") throw redirect({ to: "/capacidad/op-01" });
  },
  head: ({ params }) => ({
    meta: [
      { title: `Capacidad ${params.id.toUpperCase()} — pymapa` },
      { name: "description", content: `Recorrido de la capacidad ${params.id.toUpperCase()} del diagnóstico pymapa.` },
      { property: "og:title", content: `Capacidad ${params.id.toUpperCase()} — pymapa` },
      { property: "og:description", content: "Responde, aporta evidencias y colabora con tu equipo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  notFoundComponent: NoEncontrada,
  component: CapacidadGenerica,
});

function NoEncontrada() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <p className="text-sm text-muted-foreground">Esta capacidad no existe o no está disponible.</p>
      <Button asChild><Link to="/diagnostico-productivo">Volver al diagnóstico</Link></Button>
    </div>
  );
}

function CapacidadGenerica() {
  const capabilityId = Route.useParams().id.toUpperCase();
  const qc = useQueryClient();
  const cargarWs = useServerFn(getCapabilityWorkspace);
  const cargarCol = useServerFn(getCapabilityCollaboration);
  const responder = useServerFn(submitCapabilityResponse);
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const ws = useQuery({
    queryKey: ["capacidad", capabilityId, "workspace"],
    queryFn: () => cargarWs({ data: { capabilityId } }),
    retry: false,
  });
  const col = useQuery({
    queryKey: ["capacidad", capabilityId, "colaboracion"],
    queryFn: () => cargarCol({ data: { capabilityId } }),
    retry: false,
    enabled: ws.isSuccess,
  });

  const enviar = useMutation({
    mutationFn: (a: AcquisitionAnswer) => responder({ data: { capabilityId, ...a } }),
    onSuccess: async (r) => {
      if (!r.accepted) {
        toast.error("La respuesta no fue aceptada", { description: r.rejectionReason ?? undefined });
        return;
      }
      toast.success("Respuesta guardada");
      setSeleccion(null);
      await qc.invalidateQueries({ queryKey: ["capacidad", capabilityId] });
      await qc.invalidateQueries({ queryKey: ["hub-diagnostico"] });
    },
    onError: (e: Error) => toast.error("No pudimos guardar", { description: e.message }),
  });

  if (ws.isLoading) return <LoadingState message="Preparando la capacidad…" />;
  if (ws.error || !ws.data) return <NoEncontrada />;

  const { capability, workspace, findingsCount } = ws.data;
  const tareas = workspace.pendingInformationTasks;
  const activa: ActionableAcquisition | null =
    workspace.clarifications[0] ??
    workspace.nextQuestion ??
    tareas.find((t) => t.acquisitionId === seleccion) ??
    null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        titulo={`${capability.capabilityId} · ${capability.name}`}
        {...(capability.definition ? { subtitulo: capability.definition } : {})}
        acciones={<Button asChild variant="outline"><Link to="/diagnostico-productivo">Volver al diagnóstico</Link></Button>}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline" className="rounded-full">{ETIQUETA_ESTADO[workspace.interactionState]}</Badge>
        <span className="text-muted-foreground">
          {workspace.counts.answered} respondidas · {workspace.counts.pendingInformationTasks} requerimientos pendientes
          {workspace.counts.contradictions > 0 && ` · ${workspace.counts.contradictions} por aclarar`}
          {findingsCount > 0 && ` · ${findingsCount} hallazgos`}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {activa ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {workspace.clarifications[0] ? "Necesitamos aclarar" : "Tu siguiente paso"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <AcquisitionRenderer acquisition={activa} />
                <AcquisitionInput key={activa.acquisitionId} acquisition={activa} pending={enviar.isPending} onSubmit={(a) => enviar.mutate(a)} observaciones={col.data?.observations ?? []} />
              </CardContent>
            </Card>
          ) : tareas.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                No quedan adquisiciones disponibles para esta capacidad con la información actual.
              </CardContent>
            </Card>
          ) : null}

          {!workspace.nextQuestion && !workspace.clarifications[0] && tareas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Requerimientos de información pendientes</CardTitle>
                <CardDescription>Elige por cuál empezar; el orden no altera el diagnóstico.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tareas.map((t) => (
                    <li key={t.acquisitionId}>
                      <button
                        type="button"
                        onClick={() => setSeleccion(t.acquisitionId)}
                        className={`w-full rounded-xl border p-3 text-left text-sm transition-colors ${seleccion === t.acquisitionId ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                      >
                        <span className="block text-xs text-muted-foreground">{t.acquisitionId}</span>
                        {t.informationNeedStatement ?? t.variables.map((v) => v.name).filter(Boolean).join(" · ")}
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {col.data && (
            <>
              <EvidenciaPanel
                capabilityId={capabilityId}
                organizationId={ws.data.organizationId}
                assessmentId={ws.data.assessmentId}
                evidence={col.data.evidence}
                evidenceCandidates={col.data.evidenceCandidates}
                observations={col.data.observations}
              />
              <ColaboracionPanel
                capabilityId={capabilityId}
                respondents={col.data.respondents}
                assignments={col.data.assignments}
                informationNeeds={tareas
                  .filter((t) => t.informationNeedRef && t.informationNeedStatement)
                  .map((t) => ({ ref: t.informationNeedRef!, label: t.informationNeedStatement! }))}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
