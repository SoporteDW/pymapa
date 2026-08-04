import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { ResultState } from "@/components/resultados/result-state";
import { ConfidenceBadge } from "@/components/resultados/confidence-badge";
import { TraceabilityDrawer } from "@/components/resultados/traceability-drawer";
import { clasesNivelPrioridad } from "@/components/resultados/priority-card";
import { useResultados } from "@/hooks/use-resultados";
import { etiquetaEsfuerzo } from "@/lib/resultados/fichas";
import { registrarEvento } from "@/lib/analytics";
import { Clock, Gauge, ListChecks, SearchX, ShieldAlert, Target, UserRound } from "lucide-react";

export const Route = createFileRoute("/plan-de-accion/$accion")({
  head: () => ({
    meta: [
      { title: "Ficha de acción — pymapa" },
      {
        name: "description",
        content: "Problema, pasos sugeridos e indicadores de éxito de una acción priorizada.",
      },
      { property: "og:title", content: "Ficha de acción — pymapa" },
      {
        property: "og:description",
        content: "Problema, pasos sugeridos e indicadores de éxito de una acción priorizada.",
      },
    ],
  }),
  component: FichaAccionPage,
});

function FichaAccionPage() {
  const { accion: accionId } = useParams({ from: "/plan-de-accion/$accion" });
  const navigate = useNavigate();
  const { estado, resultado, errorCodigo, reintentar } = useResultados();

  const ficha = resultado?.actions.find((a) => a.id === accionId) ?? null;

  useEffect(() => {
    if (ficha) {
      registrarEvento("action_card_opened", { fichaId: ficha.id, nivel: ficha.priorityLevel });
    }
  }, [ficha]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={ficha?.title ?? "Ficha de acción"}
        subtitulo={
          ficha
            ? "Qué resolver, por qué importa y cómo avanzar paso a paso."
            : "Selecciona una ficha válida desde tu plan de acción."
        }
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Plan de acción", to: "/plan-de-accion" },
          { label: ficha?.title ?? "Ficha" },
        ]}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/plan-de-accion">Volver al plan</Link>
          </Button>
        }
      />

      <ResultState
        estado={estado}
        errorCodigo={errorCodigo}
        onReintentar={reintentar}
        onIrAlDiagnostico={() => navigate({ to: "/diagnostico" })}
      >
        {!ficha ? (
          <EmptyState
            title="No encontramos esta ficha"
            description="La ficha solicitada no forma parte de tu plan de acción actual."
            icon={SearchX}
            actionLabel="Volver al plan de acción"
            onAction={() => navigate({ to: "/plan-de-accion" })}
          />
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={clasesNivelPrioridad[ficha.priorityLevel]}>
                    Prioridad {ficha.priorityLabel.toLowerCase()}
                  </Badge>
                  <Badge variant="secondary">{ficha.dimensionNombre}</Badge>
                  <ConfidenceBadge nivel={ficha.nivelConfianza} valor={ficha.confidence} />
                  {ficha.requiereValidacion && (
                    <Badge variant="outline">Requiere validación previa</Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{ficha.title}</CardTitle>
                <CardDescription>{ficha.problem}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Por qué importa</p>
                  <p className="text-sm text-muted-foreground">{ficha.whyItMatters}</p>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                    Impacto esperado
                  </p>
                  <p className="text-sm text-muted-foreground">{ficha.impactExpected}</p>
                </div>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                      Dificultad estimada
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {etiquetaEsfuerzo(ficha.effort)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Tiempo aproximado
                    </p>
                    <p className="text-sm font-semibold text-foreground">{ficha.duration}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                      Responsable sugerido
                    </p>
                    <p className="text-sm font-semibold text-foreground">{ficha.ownerRole}</p>
                  </div>
                </div>
                <TraceabilityDrawer trazabilidad={ficha.sourceRefs} />
              </CardContent>
            </Card>

            {ficha.prerequisites.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Antes de empezar</CardTitle>
                  <CardDescription>
                    Estas condiciones facilitan que la acción funcione.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {ficha.prerequisites.map((requisito) => (
                      <li key={requisito} className="flex gap-2">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          aria-hidden="true"
                        />
                        {requisito}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
                  Pasos sugeridos
                </CardTitle>
                <CardDescription>
                  Un orden posible; puedes adaptarlo a la realidad de tu empresa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {ficha.steps.map((paso, index) => (
                    <li key={paso} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {index + 1}
                      </span>
                      <p className="text-sm text-muted-foreground">{paso}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Cómo saber si funcionó</CardTitle>
                  <CardDescription>Indicadores de éxito observables.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {ficha.indicators.map((indicador) => (
                      <li key={indicador} className="flex gap-2">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success"
                          aria-hidden="true"
                        />
                        {indicador}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldAlert className="h-5 w-5 text-warning" aria-hidden="true" />
                    Riesgos a considerar
                  </CardTitle>
                  <CardDescription>Y cómo reducirlos desde el inicio.</CardDescription>
                </CardHeader>
                <CardContent>
                  {ficha.risks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No se identificaron riesgos relevantes para esta acción.
                    </p>
                  ) : (
                    <ul className="space-y-3 text-sm">
                      {ficha.risks.map((riesgo) => (
                        <li key={riesgo.riesgo} className="rounded-lg border border-border p-3">
                          <p className="font-medium text-foreground">{riesgo.riesgo}</p>
                          <p className="text-muted-foreground">{riesgo.mitigacion}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <DemoNote>
              MVP Alfa: marcar avance, asignar fechas y ver la secuencia completa en un roadmap se
              incorporan en un paquete posterior.
            </DemoNote>
          </div>
        )}
      </ResultState>
    </div>
  );
}
