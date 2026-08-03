import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ResultState } from "@/components/resultados/result-state";
import { ConfidenceBadge } from "@/components/resultados/confidence-badge";
import { FindingList } from "@/components/resultados/finding-list";
import { ActionCard } from "@/components/resultados/action-card";
import { useResultados } from "@/hooks/use-resultados";
import { SearchX } from "lucide-react";

export const Route = createFileRoute("/resultados/$dimension")({
  head: () => ({
    meta: [
      { title: "Detalle por área — Pyme Digital" },
      {
        name: "description",
        content: "Revisa fortalezas, brechas y riesgos de cada área de tu diagnóstico digital.",
      },
      { property: "og:title", content: "Detalle por área — Pyme Digital" },
      {
        property: "og:description",
        content: "Revisa fortalezas, brechas y riesgos de cada área de tu diagnóstico digital.",
      },
    ],
  }),
  component: DimensionDetallePage,
});

function DimensionDetallePage() {
  const { dimension: dimensionId } = useParams({ from: "/resultados/$dimension" });
  const navigate = useNavigate();
  const { estado, resultado, errorCodigo, reintentar } = useResultados();

  const dimension = resultado?.dimensions.find((d) => d.dimensionId === dimensionId) ?? null;
  const acciones = resultado?.actions.filter((a) => a.dimensionId === dimensionId) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={dimension?.nombre ?? "Detalle del área"}
        subtitulo={
          dimension
            ? "Qué observamos en esta área y qué puedes hacer al respecto."
            : "Selecciona un área válida desde tus resultados."
        }
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Resultados", to: "/resultados" },
          { label: dimension?.nombre ?? "Área" },
        ]}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/resultados">Volver a resultados</Link>
          </Button>
        }
      />

      <ResultState
        estado={estado}
        errorCodigo={errorCodigo}
        onReintentar={reintentar}
        onIrAlDiagnostico={() => navigate({ to: "/diagnostico" })}
      >
        {!dimension ? (
          <EmptyState
            title="No encontramos esta área"
            description="El área solicitada no forma parte de tus resultados actuales."
            icon={SearchX}
            actionLabel="Volver a resultados"
            onAction={() => navigate({ to: "/resultados" })}
          />
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">Nivel de {dimension.nombre}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{dimension.maturityLabel}</Badge>
                    <ConfidenceBadge
                      nivel={dimension.nivelConfianza}
                      valor={dimension.confidence}
                    />
                  </div>
                </div>
                <CardDescription>{dimension.interpretation}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Progress
                    value={dimension.score}
                    aria-label={`${dimension.nombre}: ${dimension.score} de 100`}
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {dimension.score} / 100
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cobertura de respuestas en esta área: {dimension.cobertura}%
                  {dimension.parcial ? " · lectura parcial" : ""}
                </p>
                {dimension.notas.length > 0 && (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {dimension.notas.map((nota) => (
                      <li key={nota}>· {nota}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <FindingList tipo="fortaleza" hallazgos={dimension.fortalezas} />
              <FindingList tipo="brecha" hallazgos={dimension.brechas} />
              <FindingList tipo="riesgo" hallazgos={dimension.riesgos} />
              <FindingList tipo="oportunidad" hallazgos={dimension.oportunidades} />
            </div>

            <section aria-labelledby="acciones-area" className="space-y-3">
              <h2 id="acciones-area" className="text-lg font-semibold text-foreground">
                Fichas de acción de esta área
              </h2>
              {acciones.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    Esta área no generó fichas de acción: no se detectaron brechas prioritarias.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {acciones.map((ficha) => (
                    <ActionCard key={ficha.id} ficha={ficha} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </ResultState>
    </div>
  );
}
