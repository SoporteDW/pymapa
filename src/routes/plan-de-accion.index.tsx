/**
 * PYM-BETA-INT-01-ACT · Plan de Acción empresarial productivo.
 * Fuente única: actividades persistidas de la organización (sin mocks ni localStorage).
 */
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { getCompanyActionPlan } from "@/lib/production/action-plan.functions";

const ETIQUETA: Record<string, string> = {
  PENDING: "Pendiente",
  EXECUTING: "En curso",
  DELIVERABLE_PRODUCED: "Entregable producido",
  VALIDATED: "Validada",
  FOLLOW_UP: "En seguimiento",
  CONSOLIDATED: "Consolidada",
  NEEDS_ADJUSTMENT: "Requiere ajuste",
};

export const Route = createFileRoute("/plan-de-accion/")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/acceso" });
  },
  head: () => ({
    meta: [
      { title: "Plan de Acción — pymapa" },
      { name: "description", content: "Todas las actividades de tu empresa, con responsable, plazo, estado y origen diagnóstico." },
      { property: "og:title", content: "Plan de Acción — pymapa" },
      { property: "og:description", content: "Plan de Acción empresarial consolidado desde tus capacidades diagnosticadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanDeAccion,
});

function PlanDeAccion() {
  const cargar = useServerFn(getCompanyActionPlan);
  const q = useQuery({ queryKey: ["plan-de-accion-empresa"], queryFn: () => cargar() });
  const [filtro, setFiltro] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Plan de Acción"
        subtitulo="Actividades formuladas por tu equipo a partir del diagnóstico de cada capacidad. Son decisiones humanas, no recomendaciones institucionales."
      />
      {q.isLoading && <LoadingState message="Cargando tu Plan de Acción…" />}
      {q.isError && (
        <Card role="alert">
          <CardContent className="space-y-3 p-6">
            <p className="text-sm text-destructive">No pudimos cargar tu Plan de Acción. Revisa tu conexión e inténtalo de nuevo.</p>
            <Button variant="outline" onClick={() => q.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      )}
      {q.data && q.data.activities.length === 0 && (
        <Card data-testid="plan-vacio">
          <CardContent className="space-y-3 p-6">
            <p className="font-medium">Todavía no hay actividades en tu plan.</p>
            <p className="text-sm text-muted-foreground">
              Las actividades se crean dentro de cada capacidad, a partir de un hallazgo y una intervención decidida por tu equipo.
            </p>
            <Button asChild><Link to="/diagnostico-productivo">Ir al diagnóstico</Link></Button>
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
          <ul className="space-y-3" data-testid="plan-actividades">
            {q.data.activities.filter((a) => !filtro || a.state === filtro).map((a) => (
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
                  <CardContent className="space-y-2 text-sm">
                    <p>Responsable: {a.responsibleLabel ?? <span className="text-muted-foreground">sin asignar</span>}</p>
                    <p>Fecha límite: {a.dueDate ?? <span className="text-muted-foreground">sin fecha</span>}</p>
                    {a.deliverables.length > 0 && <p>Entregables registrados: {a.deliverables.map((d) => d.title).join(", ")}</p>}
                    {a.capabilityId && (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/capacidad/$id" params={{ id: a.capabilityId }}>
                          {q.data.canManage ? "Gestionar en la capacidad" : "Ver en la capacidad"}
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
