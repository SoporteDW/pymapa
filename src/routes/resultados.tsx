import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSesion } from "@/hooks/use-sesion";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRight, RotateCcw, Target, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/resultados")({
  head: () => ({
    meta: [
      { title: "Resultados — Pyme Digital" },
      { name: "description", content: "Hallazgos y prioridades de tu diagnóstico digital." },
      { property: "og:title", content: "Resultados — Pyme Digital" },
      { property: "og:description", content: "Hallazgos y prioridades de tu diagnóstico digital." },
    ],
  }),
  component: ResultadosPage,
});

function ResultadosPage() {
  const { sesion, isHydrated } = useSesion();

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  if (sesion.resultados.length === 0) {
    return (
      <EmptyState
        title="Aún no hay resultados"
        description="Completa el diagnóstico para ver los hallazgos y prioridades de tu empresa."
        icon={Target}
        actionLabel="Comenzar diagnóstico"
        onAction={() => {
          window.location.href = "/diagnostico";
        }}
      />
    );
  }

  const globalScore = Math.round(
    sesion.resultados.reduce((sum, r) => sum + r.puntajeDemostrativo, 0) / sesion.resultados.length
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resultados del diagnóstico</h1>
          <p className="text-sm text-muted-foreground">Resumen ejecutivo y prioridades sugeridas.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/diagnostico">
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Revisar diagnóstico
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Nivel digital ilustrativo</p>
            <p className="text-3xl font-bold text-foreground">{globalScore}/100</p>
            <p className="text-sm text-muted-foreground">En desarrollo</p>
          </div>
          <div className="flex-1 sm:max-w-md">
            <Progress value={globalScore} aria-label="Nivel digital ilustrativo" />
            <p className="mt-2 text-xs text-muted-foreground">
              Este indicador es demostrativo y no refleja una evaluación definitiva.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sesion.resultados.map((resultado) => (
          <Card key={resultado.dimension}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{resultado.dimension}</CardTitle>
                <Badge variant={resultado.puntajeDemostrativo >= 70 ? "default" : resultado.puntajeDemostrativo >= 50 ? "secondary" : "outline"}>
                  {resultado.nivel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={resultado.puntajeDemostrativo} aria-label={`Puntaje ${resultado.dimension}`} />
              <p className="text-sm text-muted-foreground">{resultado.mensaje}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
            Prioridades recomendadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {sesion.resultados
              .sort((a, b) => a.puntajeDemostrativo - b.puntajeDemostrativo)
              .slice(0, 3)
              .map((resultado) => (
                <li key={`prio-${resultado.dimension}`} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                  <span>{resultado.dimension}: {resultado.mensaje}</span>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-info/20 bg-info/5 p-4 text-sm text-info-foreground">
        <p>
          <strong>Carácter demostrativo:</strong> Estos resultados son ilustrativos. Las ponderaciones, niveles y recomendaciones definitivas se definirán en un siguiente paquete.
        </p>
      </div>

      <div className="flex justify-end">
        <Button asChild>
          <Link to="/plan-de-accion">
            Ver plan de acción
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
