import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { BarraDimension } from "@/components/diagnostico/barra-dimension";
import { useDiagnostico } from "@/hooks/use-diagnostico";
import { areasParaProfundizar } from "@/lib/diagnostico/calculo";
import { ClipboardList, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/diagnostico/resumen")({
  head: () => ({
    meta: [
      { title: "Resultado preliminar del diagnóstico — pymapa" },
      {
        name: "description",
        content:
          "Consulta tu puntaje global preliminar y el puntaje de cada una de las seis dimensiones digitales.",
      },
      { property: "og:title", content: "Resultado preliminar del diagnóstico — pymapa" },
      {
        property: "og:description",
        content:
          "Consulta tu puntaje global preliminar y el puntaje de cada una de las seis dimensiones digitales.",
      },
    ],
  }),
  component: ResumenPage,
});

function ResumenPage() {
  const navigate = useNavigate();
  const { isHydrated, resultado } = useDiagnostico();

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const encabezado = (
    <PageHeader
      titulo="Resultado preliminar"
      subtitulo="Puntajes calculados a partir de tus respuestas, en una escala de 0 a 100."
      migas={[
        { label: "Inicio", to: "/inicio" },
        { label: "Diagnóstico", to: "/diagnostico" },
        { label: "Resultado preliminar" },
      ]}
    />
  );

  if (!resultado) {
    return (
      <div className="space-y-6">
        {encabezado}
        <EmptyState
          title="Todavía no hay un resultado"
          description="Completa el diagnóstico y confirma la revisión final para calcular tu puntaje."
          icon={ClipboardList}
          actionLabel="Ir al diagnóstico"
          onAction={() => navigate({ to: "/diagnostico" })}
        />
      </div>
    );
  }

  const areas = areasParaProfundizar(resultado.dimensionResults);

  return (
    <div className="space-y-6">
      {encabezado}

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardDescription className="font-medium text-primary">Puntaje global</CardDescription>
          <CardTitle className="flex flex-wrap items-baseline gap-2 text-4xl">
            <span className="tabular-nums">{resultado.globalScore.toFixed(1)}</span>
            <span className="text-base font-normal text-muted-foreground">de 100</span>
          </CardTitle>
          <CardDescription className="text-base text-foreground">
            Nivel preliminar: <strong className="font-semibold">{resultado.globalLevel}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{resultado.globalMessage}</p>
          <p className="text-xs text-muted-foreground">
            Finalizado el{" "}
            {format(new Date(resultado.calculatedAt), "d 'de' MMMM yyyy · HH:mm", { locale: es })}
          </p>
        </CardContent>
      </Card>

      <section aria-labelledby="dimensiones-resultado" className="space-y-3">
        <h2 id="dimensiones-resultado" className="text-lg font-semibold text-foreground">
          Puntaje por dimensión
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {resultado.dimensionResults.map((dimension) => (
            <BarraDimension
              key={dimension.dimensionId}
              resultado={dimension}
              destacada={areas.includes(dimension.dimensionId)}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Las dos dimensiones con menor puntaje se señalan como áreas para profundizar. Un puntaje
          bajo no significa un fracaso: indica dónde hay más espacio para avanzar.
        </p>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/5 p-4 text-sm text-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
        <p>En el siguiente paso, el modelo interpretará estos resultados y propondrá prioridades.</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" asChild>
          <Link to="/diagnostico/cierre">Ver suficiencia y evidencias</Link>
        </Button>
        <Button asChild size="lg">
          <Link to="/inicio">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
