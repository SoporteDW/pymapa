/**
 * PYM-BETA-INT-02-SEG · Seguimiento empresarial productivo.
 * Fuente única: actividades validadas, validaciones y follow-ups persistidos.
 * Sin mocks, sin localStorage, sin scoring ni indicadores inventados.
 */
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { decideCompanyFollowUp, getCompanySeguimiento, startCompanyFollowUp } from "@/lib/production/seguimiento.functions";

const ETIQUETA: Record<string, string> = {
  VALIDATED: "Validada",
  FOLLOW_UP: "En seguimiento",
  CONSOLIDATED: "Consolidada",
  NEEDS_ADJUSTMENT: "Requiere ajuste",
  OPEN: "Abierto",
};

export const Route = createFileRoute("/seguimiento/")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/acceso" });
  },
  head: () => ({
    meta: [
      { title: "Seguimiento — pymapa" },
      { name: "description", content: "Actividades validadas de tu empresa y su seguimiento, con decisión humana documentada." },
      { property: "og:title", content: "Seguimiento — pymapa" },
      { property: "og:description", content: "Seguimiento empresarial de actividades validadas: consolidar o ajustar con nota obligatoria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Seguimiento,
});

function Seguimiento() {
  const cargar = useServerFn(getCompanySeguimiento);
  const iniciar = useServerFn(startCompanyFollowUp);
  const decidir = useServerFn(decideCompanyFollowUp);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["seguimiento-empresa"], queryFn: () => cargar() });
  const [filtro, setFiltro] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});

  const tras = (r: { accepted: boolean; rejectionReason: string | null }) => {
    if (r.accepted) toast.success("Seguimiento actualizado");
    else toast.error(`No se pudo registrar (${r.rejectionReason ?? "rechazado"})`);
    void qc.invalidateQueries({ queryKey: ["seguimiento-empresa"] });
    void qc.invalidateQueries({ queryKey: ["plan-de-accion-empresa"] });
  };
  const mIniciar = useMutation({
    mutationFn: (validationId: string) => iniciar({ data: { validationId } }),
    onSuccess: tras,
    onError: () => toast.error("No tienes permiso o la actividad no admite seguimiento."),
  });
  const mDecidir = useMutation({
    mutationFn: (v: { followUpId: string; outcome: "CONSOLIDATED" | "NEEDS_ADJUSTMENT"; note: string }) => decidir({ data: v }),
    onSuccess: (r, v) => {
      tras(r);
      if (r.accepted) setNotas((n) => ({ ...n, [v.followUpId]: "" }));
    },
    onError: () => toast.error("No tienes permiso o falta la nota de decisión."),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Seguimiento"
        subtitulo="Actividades ya validadas por tu equipo. Aquí decides, con una nota, si el cambio se consolida o requiere ajuste."
      />
      {q.isLoading && <LoadingState message="Cargando tu seguimiento…" />}
      {q.isError && (
        <Card role="alert">
          <CardContent className="space-y-3 p-6">
            <p className="text-sm text-destructive">No pudimos cargar el seguimiento. Inténtalo de nuevo.</p>
            <Button variant="outline" onClick={() => q.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      )}
      {q.data && q.data.activities.length === 0 && (
        <Card data-testid="seguimiento-vacio">
          <CardContent className="space-y-3 p-6">
            <p className="font-medium">Todavía no hay actividades validadas.</p>
            <p className="text-sm text-muted-foreground">
              El seguimiento empieza cuando una actividad de tu Plan de Acción queda validada dentro de su capacidad.
            </p>
            <Button asChild><Link to="/plan-de-accion">Ir al Plan de Acción</Link></Button>
          </CardContent>
        </Card>
      )}
      {q.data && q.data.activities.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
            <Button size="sm" variant={filtro === null ? "default" : "outline"} onClick={() => setFiltro(null)}>
              Todas ({q.data.summary.total})
            </Button>
            {Object.entries(q.data.summary.byState).map(([estado, n]) => (
              <Button key={estado} size="sm" variant={filtro === estado ? "default" : "outline"} onClick={() => setFiltro(estado)}>
                {ETIQUETA[estado] ?? estado} ({n})
              </Button>
            ))}
          </div>
          <ul className="space-y-3" data-testid="seguimiento-actividades">
            {q.data.activities.filter((a) => !filtro || a.state === filtro).map((a) => {
              const nota = a.openFollowUpId ? (notas[a.openFollowUpId] ?? "") : "";
              return (
                <li key={a.id}>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {a.capabilityId && <Badge variant="outline">{a.capabilityId}</Badge>}
                        <Badge variant="secondary">{ETIQUETA[a.state] ?? a.state}</Badge>
                      </div>
                      <CardTitle className="text-base">{a.title}</CardTitle>
                      <CardDescription>
                        Intervención: {a.intervention.title}
                        {a.finding ? ` · Hallazgo ${a.finding.ref}: ${a.finding.name}` : " · Sin hallazgo vinculado"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p>Responsable: {a.responsibleLabel ?? <span className="text-muted-foreground">sin asignar</span>}</p>
                      {a.deliverables.length > 0 && <p>Entregables: {a.deliverables.map((d) => d.title).join(", ")}</p>}
                      <p>
                        Validación: {a.validation ? `${a.validation.status}${a.validation.reviewedAt ? ` · ${a.validation.reviewedAt.slice(0, 10)}` : ""}` : "sin registro"}
                      </p>
                      {a.followUps.length > 0 && (
                        <ul className="space-y-1 border-l border-border pl-3">
                          {a.followUps.map((f) => (
                            <li key={f.id}>
                              {ETIQUETA[f.status] ?? f.status} · {f.createdAt.slice(0, 10)}
                              {f.note ? <span className="text-muted-foreground"> — {f.note}</span> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                      {q.data.canManage && a.canStartFollowUp && a.validation && (
                        <Button size="sm" disabled={mIniciar.isPending} onClick={() => mIniciar.mutate(a.validation!.id)}>
                          Iniciar seguimiento
                        </Button>
                      )}
                      {q.data.canManage && a.openFollowUpId && (
                        <div className="space-y-2">
                          <Textarea
                            aria-label="Nota de decisión"
                            placeholder="Qué observaste y por qué decides (obligatorio)"
                            value={nota}
                            onChange={(e) => setNotas((n) => ({ ...n, [a.openFollowUpId!]: e.target.value }))}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" disabled={!nota.trim() || mDecidir.isPending}
                              onClick={() => mDecidir.mutate({ followUpId: a.openFollowUpId!, outcome: "CONSOLIDATED", note: nota.trim() })}>
                              Consolidar
                            </Button>
                            <Button size="sm" variant="outline" disabled={!nota.trim() || mDecidir.isPending}
                              onClick={() => mDecidir.mutate({ followUpId: a.openFollowUpId!, outcome: "NEEDS_ADJUSTMENT", note: nota.trim() })}>
                              Requiere ajuste
                            </Button>
                          </div>
                        </div>
                      )}
                      {!q.data.canManage && <p className="text-xs text-muted-foreground">Solo propietarios o administradores registran decisiones.</p>}
                      {a.capabilityId && (
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/capacidad/$id" params={{ id: a.capabilityId }}>Ver en la capacidad</Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
