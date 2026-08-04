import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { ResultState } from "@/components/resultados/result-state";
import { ResultSummaryCard } from "@/components/resultados/result-summary-card";
import { DimensionScoreCard } from "@/components/resultados/dimension-score-card";
import { FindingList } from "@/components/resultados/finding-list";
import { PriorityCard } from "@/components/resultados/priority-card";
import { useResultados } from "@/hooks/use-resultados";
import { registrarEvento } from "@/lib/analytics";
import { ArrowRight, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/resultados/")({
  head: () => ({
    meta: [
      { title: "Resultados — pymapa" },
      {
        name: "description",
        content: "Interpreta el estado digital de tu empresa y conoce tus prioridades.",
      },
      { property: "og:title", content: "Resultados — pymapa" },
      {
        property: "og:description",
        content: "Interpreta el estado digital de tu empresa y conoce tus prioridades.",
      },
    ],
  }),
  component: ResultadosPage,
});

function ResultadosPage() {
  const navigate = useNavigate();
  const {
    estado,
    resultado,
    escenarioId,
    escenarios,
    errorCodigo,
    aplicarEscenario,
    reintentar,
  } = useResultados();

  useEffect(() => {
    if (resultado) {
      registrarEvento("results_viewed", {
        resultadoId: resultado.id,
        puntaje: resultado.overallScore,
      });
    }
  }, [resultado]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Tus resultados"
        subtitulo="Primero el significado, después el número: así puedes decidir con claridad."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Resultados" }]}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/diagnostico/revision">Revisar respuestas</Link>
          </Button>
        }
      />

      <ResultState
        estado={estado}
        errorCodigo={errorCodigo}
        onReintentar={reintentar}
        onIrAlDiagnostico={() => navigate({ to: "/diagnostico" })}
      >
        {resultado && (
          <div className="space-y-6">
            {resultado.completeness === "parcial" && (
              <Card className="border-warning/40 bg-warning/5">
                <CardHeader>
                  <CardTitle className="text-base">Lectura parcial</CardTitle>
                  <CardDescription>
                    Respondiste el {resultado.cobertura}% del diagnóstico. Los resultados son
                    válidos, pero completar las preguntas pendientes aumenta la precisión.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/diagnostico/revision">Completar respuestas</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <ResultSummaryCard
              resultado={resultado}
              accionPrimaria={
                <Button size="sm" asChild>
                  <Link to="/plan-de-accion">
                    Ver mi plan de acción
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />

            <section aria-labelledby="dimensiones" className="space-y-3">
              <h2 id="dimensiones" className="text-lg font-semibold text-foreground">
                Resultados por área
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resultado.dimensions.map((dimension) => (
                  <DimensionScoreCard key={dimension.dimensionId} dimension={dimension} />
                ))}
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <FindingList tipo="fortaleza" hallazgos={resultado.fortalezas.slice(0, 5)} />
              <FindingList tipo="brecha" hallazgos={resultado.brechas.slice(0, 5)} />
            </div>

            <section aria-labelledby="prioridades" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="prioridades" className="text-lg font-semibold text-foreground">
                  Tus prioridades
                </h2>
                <Badge variant="outline">
                  {resultado.topPriorities.length} de {resultado.priorities.length}
                </Badge>
              </div>
              {resultado.topPriorities.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    No se identificaron prioridades relevantes con la evidencia disponible.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {resultado.topPriorities.map((prioridad, index) => (
                    <PriorityCard
                      key={prioridad.id}
                      prioridad={prioridad}
                      posicion={index + 1}
                      acciones={
                        <>
                          <Button size="sm" variant="outline" asChild>
                            <Link
                              to="/resultados/$dimension"
                              params={{ dimension: prioridad.dimensionId }}
                            >
                              Ver el área relacionada
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <Link to="/plan-de-accion">Ver ficha de acción</Link>
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <Accordion
              type="single"
              collapsible
              className="rounded-xl border border-border bg-card px-4"
            >
              <AccordionItem value="como-leer" className="border-none">
                <AccordionTrigger className="text-sm font-medium">
                  Cómo leer estos resultados
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Cada área describe una capacidad de tu empresa, no una calificación de tu
                    trabajo. Un nivel bajo indica una oportunidad concreta, no un problema.
                  </p>
                  <p>
                    El indicador general resume las áreas evaluadas y sirve para comparar tu avance
                    contigo mismo en el tiempo, no con otras empresas.
                  </p>
                  <p>
                    Las prioridades combinan impacto, urgencia, riesgo, dependencias y esfuerzo, y
                    se ajustan según la confianza de la evidencia disponible.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <DemoNote>
              MVP Alfa: los resultados se calculan con reglas propias y trazabilidad completa. Las
              redacciones podrán ajustarse con la validación de usuarios reales.
            </DemoNote>
          </div>
        )}
      </ResultState>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
            Escenarios de validación
          </CardTitle>
          <CardDescription>
            Escenarios técnicos del POC-05 para revisar cómo responde el sistema ante distintos
            perfiles. Tus respuestas propias no se modifican.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={escenarioId ? "outline" : "default"}
            onClick={() => aplicarEscenario(null)}
          >
            Mis respuestas
          </Button>
          {escenarios.map((escenario) => (
            <Button
              key={escenario.id}
              size="sm"
              variant={escenarioId === escenario.id ? "default" : "outline"}
              onClick={() => aplicarEscenario(escenario.id)}
              title={escenario.resultadoEsperado}
            >
              {escenario.nombre}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
