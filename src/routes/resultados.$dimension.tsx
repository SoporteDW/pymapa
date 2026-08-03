import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { useSesion } from "@/hooks/use-sesion";
import { preguntasDemo } from "@/data/mocks/diagnostico";
import { ArrowRight, SearchX } from "lucide-react";

export const Route = createFileRoute("/resultados/$dimension")({
  head: () => ({
    meta: [
      { title: "Detalle del área — Pyme Digital" },
      {
        name: "description",
        content: "Profundiza en un área del diagnóstico sin perder la vista general.",
      },
      { property: "og:title", content: "Detalle del área — Pyme Digital" },
      {
        property: "og:description",
        content: "Profundiza en un área del diagnóstico sin perder la vista general.",
      },
    ],
  }),
  component: DetalleDimensionPage,
});

function DetalleDimensionPage() {
  const { dimension } = useParams({ from: "/resultados/$dimension" });
  const navigate = useNavigate();
  const { sesion, isHydrated } = useSesion();

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const resultado = sesion.resultados.find((r) => r.id === dimension);

  if (!resultado) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Área no encontrada"
          subtitulo="No pudimos encontrar el área que intentas abrir."
          migas={[
            { label: "Inicio", to: "/inicio" },
            { label: "Resultados", to: "/resultados" },
            { label: "No encontrada" },
          ]}
        />
        <EmptyState
          title="Este detalle no está disponible"
          description="Puede que el área haya cambiado o que aún no tengas resultados generados."
          icon={SearchX}
          actionLabel="Volver a Resultados"
          onAction={() => navigate({ to: "/resultados" })}
        />
      </div>
    );
  }

  const preguntas = preguntasDemo.filter((p) => resultado.preguntasRelacionadas.includes(p.id));
  const acciones = sesion.acciones.filter((a) => resultado.accionesRelacionadas.includes(a.id));

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={resultado.dimension}
        subtitulo={resultado.mensaje}
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Resultados", to: "/resultados" },
          { label: resultado.dimension },
        ]}
        acciones={<Badge variant="secondary">{resultado.nivel}</Badge>}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Nivel ilustrativo de esta área</CardDescription>
          <CardTitle className="text-2xl">{resultado.puntajeDemostrativo} de 100</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress
            value={resultado.puntajeDemostrativo}
            aria-label={`Nivel ilustrativo de ${resultado.dimension}`}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qué observamos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {resultado.queObservamos}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qué significa para tu empresa</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {resultado.queSignifica}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preguntas relacionadas</CardTitle>
          <CardDescription>
            Estas respuestas alimentarán la lógica de evaluación en paquetes posteriores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {preguntas.map((pregunta) => {
              const respuesta = sesion.respuestas.find((r) => r.preguntaId === pregunta.id);
              const etiqueta = pregunta.opciones?.find(
                (o) => String(o.valor) === String(respuesta?.valor)
              )?.etiqueta;
              return (
                <li key={pregunta.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{pregunta.texto}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {etiqueta ?? "Respuesta demostrativa no registrada"}
                  </p>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {acciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acciones asociadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {acciones.map((accion) => (
              <div
                key={accion.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{accion.titulo}</p>
                  <p className="text-sm text-muted-foreground">{accion.proposito}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/plan-de-accion/$accion" params={{ accion: accion.id }}>
                    Ver acción
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <DemoNote>
        Contenido ilustrativo del MVP Alfa: la explicación definitiva de cada área provendrá del
        motor de conocimiento en un paquete posterior.
      </DemoNote>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" asChild>
          <Link to="/resultados">Volver a Resultados</Link>
        </Button>
        <Button asChild>
          <Link to="/plan-de-accion">
            Ver acciones relacionadas
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
