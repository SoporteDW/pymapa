import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { useSesion } from "@/hooks/use-sesion";
import { etiquetaEstadoAccion, etiquetaHorizonte } from "@/lib/recorrido";
import { toast } from "sonner";
import { CheckCircle2, Clock, Play, SearchX, UserRound } from "lucide-react";

export const Route = createFileRoute("/plan-de-accion/$accion")({
  head: () => ({
    meta: [
      { title: "Detalle de la acción — Pyme Digital" },
      {
        name: "description",
        content: "Ficha provisional de la acción: propósito, pasos y estado.",
      },
      { property: "og:title", content: "Detalle de la acción — Pyme Digital" },
      {
        property: "og:description",
        content: "Ficha provisional de la acción: propósito, pasos y estado.",
      },
    ],
  }),
  component: DetalleAccionPage,
});

function DetalleAccionPage() {
  const { accion: accionId } = useParams({ from: "/plan-de-accion/$accion" });
  const navigate = useNavigate();
  const { sesion, isHydrated, cambiarEstadoAccion } = useSesion();

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const accion = sesion.acciones.find((a) => a.id === accionId);

  if (!accion) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Acción no encontrada"
          subtitulo="No pudimos encontrar la acción que intentas abrir."
          migas={[
            { label: "Inicio", to: "/inicio" },
            { label: "Plan de acción", to: "/plan-de-accion" },
            { label: "No encontrada" },
          ]}
        />
        <EmptyState
          title="Esta acción no está disponible"
          description="Puede que haya cambiado o que aún no tengas un plan de acción generado."
          icon={SearchX}
          actionLabel="Volver al plan"
          onAction={() => navigate({ to: "/plan-de-accion" })}
        />
      </div>
    );
  }

  const dimension = sesion.resultados.find((r) => r.id === accion.dimensionId);

  const handleComenzar = () => {
    cambiarEstadoAccion(accion.id, "en_progreso");
    toast.success("Marcamos esta acción como iniciada.", {
      description: "El cambio se guardó en este navegador.",
    });
  };

  const handleCompletar = () => {
    cambiarEstadoAccion(accion.id, "completada");
    toast.success("Marcamos esta acción como completada.", {
      description: "El cambio se guardó en este navegador.",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={accion.titulo}
        subtitulo={accion.proposito}
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Plan de acción", to: "/plan-de-accion" },
          { label: accion.titulo },
        ]}
        acciones={
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{etiquetaHorizonte[accion.horizonte]}</Badge>
            <Badge variant="outline">{etiquetaEstadoAccion[accion.estado]}</Badge>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por qué importa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{accion.porQueImporta}</p>
          {dimension && (
            <p>
              Se relaciona con el área{" "}
              <Link
                to="/resultados/$dimension"
                params={{ dimension: dimension.id }}
                className="text-primary underline"
              >
                {dimension.dimension}
              </Link>
              , hoy en nivel {dimension.nivel.toLowerCase()}.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Qué incluye</CardTitle>
          <CardDescription>Pasos demostrativos para orientar la ejecución.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {accion.pasos.map((paso, index) => (
              <li key={paso} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="text-sm text-foreground">{paso}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Duración estimada
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm font-medium text-foreground">
            {accion.duracionEstimada}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Responsable sugerido
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm font-medium text-foreground">
            {accion.responsableSugerido}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Impacto y esfuerzo
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm font-medium text-foreground">
            Impacto {accion.impacto} · esfuerzo {accion.esfuerzo}
          </CardContent>
        </Card>
      </div>

      <DemoNote>
        Esta es una ficha provisional. La Ficha de Acción completa, con recursos y seguimiento
        detallado, se definirá en el POC-05.
      </DemoNote>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" asChild>
          <Link to="/plan-de-accion">Volver al plan</Link>
        </Button>
        {accion.estado === "completada" ? (
          <span className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Acción completada
          </span>
        ) : accion.estado === "en_progreso" ? (
          <Button onClick={handleCompletar}>
            <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Marcar como completada
          </Button>
        ) : (
          <Button onClick={handleComenzar}>
            <Play className="mr-2 h-4 w-4" aria-hidden="true" />
            Comenzar acción demostrativa
          </Button>
        )}
      </div>
    </div>
  );
}
