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
import { CoberturaDocumentalPanel } from "@/components/capacidad/cobertura-documental-panel";
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
  component: CapacidadPorId,
});

/** SPRINT-04-FIX · Cambiar de capacidad remonta todo el estado de UI. */
function CapacidadPorId() {
  const capabilityId = Route.useParams().id.toUpperCase();
  return <CapacidadGenerica key={capabilityId} capabilityId={capabilityId} />;
}

function NoEncontrada() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <p className="text-sm text-muted-foreground">Esta capacidad no existe o no está disponible.</p>
      <Button asChild><Link to="/diagnostico-productivo">Volver al diagnóstico</Link></Button>
    </div>
  );
}

const ESTADO_RESPUESTA: Record<string, string> = {
  KNOWN: "Respondida",
  UNKNOWN: "No se sabe por ahora",
  NOT_APPLICABLE: "No aplica",
  CONTRADICTORY: "Marcada como contradictoria",
};

type Workspace = Awaited<ReturnType<typeof getCapabilityWorkspace>>;
type Entrada = Workspace["responseHistory"][number];

function CapacidadGenerica({ capabilityId }: { capabilityId: string }) {
  const qc = useQueryClient();
  const cargarWs = useServerFn(getCapabilityWorkspace);
  const cargarCol = useServerFn(getCapabilityCollaboration);
  const responder = useServerFn(submitCapabilityResponse);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [corrigiendo, setCorrigiendo] = useState<Entrada | null>(null);

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
    mutationFn: (a: AcquisitionAnswer & { correctsObservationId?: string }) =>
      responder({ data: { capabilityId, ...a } }),
    onSuccess: async (r) => {
      if (!r.accepted) {
        toast.error("La respuesta no fue aceptada", { description: r.rejectionReason ?? undefined });
        return;
      }
      const eraModificacion = Boolean(corrigiendo);
      const habiaAclaracion = (ws.data?.clarificationDetails.length ?? 0) > 0;
      setSeleccion(null);
      setCorrigiendo(null);
      // Estado inmediato: el workspace recién evaluado actualiza la tarjeta del
      // hub en caché; después se revalida el hub completo en segundo plano.
      const nuevo = await qc.fetchQuery({
        queryKey: ["capacidad", capabilityId, "workspace"],
        queryFn: () => cargarWs({ data: { capabilityId } }),
        staleTime: 0,
      });
      // Reevaluación gobernada: el estado de aclaración sale del Engine, no de la edición.
      const persiste = nuevo.clarificationDetails.length > 0;
      if (eraModificacion && habiaAclaracion) {
        if (persiste) toast.warning("Respuesta modificada, pero la aclaración sigue pendiente", { description: "El diagnóstico se reevaluó y todavía hay información que no coincide." });
        else toast.success("Aclaración resuelta", { description: "El diagnóstico se reevaluó y ya no encuentra información contradictoria." });
      } else toast.success(eraModificacion ? "Respuesta modificada y reevaluada" : "Respuesta guardada");
      qc.setQueryData(["hub-diagnostico"], (hub: { capabilities: { capabilityId: string }[] } | undefined) =>
        hub
          ? {
              ...hub,
              capabilities: hub.capabilities.map((c) =>
                c.capabilityId === capabilityId
                  ? { ...c, interactionState: nuevo.workspace.interactionState, counts: nuevo.workspace.counts, findingsCount: nuevo.findingsCount }
                  : c,
              ),
            }
          : hub,
      );
      void qc.invalidateQueries({ queryKey: ["capacidad", capabilityId, "colaboracion"] });
      void qc.invalidateQueries({ queryKey: ["hub-diagnostico"], refetchType: "all" });
    },
    onError: (e: Error) => toast.error("No pudimos guardar", { description: e.message }),
  });

  if (ws.isLoading) return <LoadingState message="Preparando la capacidad…" />;
  if (ws.error || !ws.data) return <NoEncontrada />;

  const { capability, workspace, findingsCount, responseHistory, clarificationDetails } = ws.data;
  const tareas = workspace.pendingInformationTasks;
  const porId = new Map(responseHistory.map((h) => [h.observationId, h]));
  const activa: ActionableAcquisition | null = corrigiendo
    ? corrigiendo.acquisition
    : (workspace.clarifications[0] ??
      workspace.nextQuestion ??
      tareas.find((t) => t.acquisitionId === seleccion) ??
      null);
  const c = workspace.counts;
  const enAclaracion = Boolean(corrigiendo && clarificationDetails.some((d) => d.observationIds.includes(corrigiendo.observationId)));
  const hub = qc.getQueryData<{ capabilities: { capabilityId: string; interactionState: string }[] }>(["hub-diagnostico"]);
  const siguiente = hub?.capabilities.find((x) => x.capabilityId !== capabilityId && x.interactionState === "NOT_STARTED") ?? null;

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
          {c.answered} con respuesta
          {c.literalQuestions > 0 && ` · ${c.eligibleQuestions} ${c.eligibleQuestions === 1 ? "pregunta disponible" : "preguntas disponibles"} ahora`}
          {c.questionsNotYetEnabled > 0 && ` · ${c.questionsNotYetEnabled} condicionales no activadas (no son trabajo pendiente)`}
          {c.informationTasks > 0 && ` · ${c.pendingInformationTasks} de ${c.informationTasks} requerimientos de información pendientes`}
          {c.contradictions > 0 && ` · ${c.contradictions} por aclarar`}
          {findingsCount > 0 && ` · ${findingsCount} hallazgos`}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {clarificationDetails.length > 0 && !corrigiendo && (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-base">Aclaración pendiente</CardTitle>
                <CardDescription>
                  Hay respuestas que no coinciden entre sí sobre el mismo tema. Elige la que no sea correcta y escribe la versión buena: Pymapa vuelve a revisar y te dice si quedó resuelto. Nada se borra.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {clarificationDetails.map((d) => (
                  <div key={d.variableRef} className="space-y-2 rounded-xl border border-border p-3 text-sm">
                    <p className="font-medium">{d.variableName ?? d.variableRef}</p>
                    <p className="text-muted-foreground">
                      {d.reason === "DECLARED_CONTRADICTORY"
                        ? "Una respuesta indicó que hay versiones que se contradicen. Escribe la versión correcta, o indica que no lo sabes por ahora."
                        : `Estas ${d.observationIds.length} respuestas dicen cosas distintas sobre lo mismo. Revisa cuál es la correcta y modifica las demás.`}
                    </p>
                    <ul className="space-y-2">
                      {d.observationIds.map((id) => {
                        const h = porId.get(id);
                        if (!h) return null;
                        return (
                          <li key={id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-muted/50 p-2">
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs text-muted-foreground">{h.label ?? "Respuesta"} · {new Date(h.recordedAt).toLocaleDateString("es")}</span>
                              {h.semanticValue ?? h.notApplicableReason ?? "—"}
                            </span>
                            {h.canCorrect ? (
                              <Button size="sm" variant="destructive" onClick={() => setCorrigiendo(h)}>Resolver aclaración</Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Solo quien la respondió o un administrador puede modificarla</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {!d.packClarificationAvailable && (
                      <p className="text-xs text-muted-foreground">
                        Esta capacidad no trae una pregunta de aclaración propia: la aclaración se hace corrigiendo la respuesta.
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activa ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {corrigiendo ? (enAclaracion ? "Resolver aclaración" : "Modificar respuesta") : workspace.clarifications[0] ? "Pregunta de aclaración" : "Tu siguiente paso"}
                </CardTitle>
                {corrigiendo && (
                  <CardDescription>
                    Respuesta actual: {corrigiendo.semanticValue ?? corrigiendo.notApplicableReason ?? ESTADO_RESPUESTA[corrigiendo.knowledgeState]}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-5">
                <AcquisitionRenderer acquisition={activa} />
                <AcquisitionInput
                  key={`${activa.acquisitionId}-${corrigiendo?.observationId ?? "nueva"}`}
                  acquisition={activa}
                  pending={enviar.isPending}
                  onSubmit={(a) =>
                    enviar.mutate(corrigiendo ? { ...a, correctsObservationId: corrigiendo.observationId } : a)
                  }
                  observaciones={(col.data?.observations ?? []).map((o) => ({ ...o, label: porId.get(o.id)?.label ?? null }))}
                />
                {corrigiendo && (
                  <Button variant="ghost" onClick={() => setCorrigiendo(null)}>Cancelar</Button>
                )}
              </CardContent>
            </Card>
          ) : tareas.length === 0 && clarificationDetails.length === 0 ? (
            <Card data-testid="sin-preguntas">
              <CardHeader>
                <CardTitle className="text-base">No hay más preguntas disponibles por ahora</CardTitle>
                <CardDescription>
                  Con lo que ya respondiste no se activan más preguntas en esta capacidad. Esto no significa que su diagnóstico esté cerrado.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {siguiente && (
                  <Button asChild>
                    <Link to="/capacidad/$id" params={{ id: siguiente.capabilityId }}>Continuar con otra capacidad: {siguiente.capabilityId}</Link>
                  </Button>
                )}
                <Button asChild variant="outline"><Link to="/diagnostico-productivo">Volver al diagnóstico</Link></Button>
                {responseHistory.length > 0 && (
                  <Button variant="ghost" onClick={() => document.getElementById("respuestas")?.scrollIntoView({ behavior: "smooth" })}>Consultar respuestas</Button>
                )}
                {siguiente && <p className="w-full text-xs text-muted-foreground">La sugerencia es solo de navegación (siguiente capacidad sin iniciar del catálogo), no una prioridad para tu negocio.</p>}
              </CardContent>
            </Card>
          ) : null}

          {!corrigiendo && !workspace.nextQuestion && !workspace.clarifications[0] && tareas.length > 0 && (
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
                        {t.informationNeedStatement ?? t.variables.map((v) => v.name).filter(Boolean).join(" · ")}
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card id="respuestas">
            <CardHeader>
              <CardTitle className="text-base">Respuestas registradas ({responseHistory.filter((h) => !h.supersededByObservationId).length})</CardTitle>
              <CardDescription>Estas respuestas ya quedaron guardadas. Puedes modificarlas si cambió algo; la versión anterior se conserva en el historial.</CardDescription>
            </CardHeader>
            <CardContent>
              {responseHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay respuestas en esta capacidad.</p>
              ) : (
                <ul className="space-y-2" data-testid="historial-respuestas">
                  {responseHistory.map((h) => (
                    <li key={h.observationId} className={`rounded-xl border p-3 text-sm ${h.supersededByObservationId ? "border-dashed border-border opacity-70" : "border-border"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {h.supersededByObservationId ? "Versión anterior (reemplazada)" : `Registrada · ${ESTADO_RESPUESTA[h.knowledgeState] ?? h.knowledgeState}`}
                          {h.correctsObservationId && " · modificada"}
                        </span>
                        {h.canCorrect && !h.supersededByObservationId && (
                          <Button size="sm" variant="link" className="h-auto p-0 text-xs text-muted-foreground" onClick={() => setCorrigiendo(h)}>Modificar respuesta</Button>
                        )}
                      </div>
                      {h.label && <p className="mt-1 font-medium">{h.label}</p>}
                      <p className="mt-1">{h.semanticValue ?? h.notApplicableReason ?? "—"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(h.recordedAt).toLocaleString("es")}
                        {h.submittedBySelf ? " · por ti" : h.submittedBy ? ` · por ${h.submittedBy}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
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
                observations={col.data.observations.map((o) => ({ ...o, label: porId.get(o.id)?.label ?? null }))}
              />
              <ColaboracionPanel
                capabilityId={capabilityId}
                respondents={col.data.respondents}
                assignments={col.data.assignments}
                informationNeeds={tareas
                  .filter((t) => t.informationNeedRef && t.informationNeedStatement)
                  .map((t) => ({ ref: t.informationNeedRef!, label: t.informationNeedStatement! }))}
              />
              <CoberturaDocumentalPanel
                capabilityId={capabilityId}
                mappings={ws.data.documentaryMappings}
                canGovern={ws.data.userRole === "OWNER" || ws.data.userRole === "ADMIN"}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
