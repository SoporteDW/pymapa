import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { BadgeEstadoEjecucion } from "@/components/workspace/badge-estado-ejecucion";
import { PanelInstrumento } from "@/components/workspace/panel-instrumento";
import { PanelChecklist } from "@/components/workspace/panel-checklist";
import { FormularioEntrega } from "@/components/workspace/formulario-entrega";
import { HistorialEntregas } from "@/components/workspace/historial-entregas";
import { useWorkspace } from "@/hooks/use-workspace";
import { descripcionEstadoEjecucion, puedeEntregar } from "@/lib/workspace/estados";
import { toast } from "sonner";
import { PlayCircle, RotateCcw, SearchX, Target } from "lucide-react";

export const Route = createFileRoute("/plan-de-accion/workspace/$actividad")({
  head: () => ({
    meta: [
      { title: "Workspace de ejecución de la actividad — pymapa" },
      {
        name: "description",
        content:
          "Ejecuta la actividad con su instrumento metodológico, entrega el resultado y recibe la revisión con ajustes concretos.",
      },
      { property: "og:title", content: "Workspace de ejecución de la actividad — pymapa" },
      {
        property: "og:description",
        content:
          "Objetivo, metodología, pasos, entregable y ciclo de validación de cada actividad priorizada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const { actividad: actividadId } = useParams({ from: "/plan-de-accion/workspace/$actividad" });
  const navigate = useNavigate();
  const {
    hidratado,
    actividad,
    existeEnRecorrido,
    iniciar,
    alternarPaso,
    revisarVerificacion,
    entregar,
    retomar,
  } = useWorkspace(actividadId);

  if (!hidratado) return <LoadingState fullPage />;

  if (!actividad) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Workspace de ejecución"
          subtitulo="Selecciona una actividad de tu plan de acción para trabajarla con su instrumento."
          migas={[
            { label: "Inicio", to: "/inicio" },
            { label: "Plan de acción", to: "/plan-de-accion" },
            { label: "Workspace" },
          ]}
        />
        <EmptyState
          title="No encontramos esta actividad"
          description={
            existeEnRecorrido
              ? "La actividad existe, pero aún no pudimos abrir su workspace. Vuelve a intentarlo."
              : "Esta actividad no forma parte de tu plan de acción actual ni del escenario de demostración."
          }
          icon={SearchX}
          actionLabel="Volver al plan de acción"
          onAction={() => navigate({ to: "/plan-de-accion" })}
        />
      </div>
    );
  }

  const esDemo = actividad.origen.tipo === "escenario_demo";

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={actividad.titulo}
        subtitulo="Qué se busca lograr, con qué instrumento se trabaja, qué se entrega y cómo se valida."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Plan de acción", to: "/plan-de-accion" },
          { label: "Workspace" },
        ]}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/plan-de-accion">Volver al plan</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <BadgeEstadoEjecucion estado={actividad.estado} />
            <Badge variant="secondary">{actividad.origen.dominioNombre}</Badge>
            {esDemo && <Badge variant="outline">Escenario de demostración</Badge>}
          </div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" aria-hidden="true" />
            {actividad.objetivo}
          </CardTitle>
          <CardDescription>{descripcionEstadoEjecucion[actividad.estado]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Por qué esta actividad</p>
            <p className="text-sm text-muted-foreground">{actividad.porQue}</p>
          </div>
          <Separator />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Trazabilidad</p>
            <p className="text-xs text-muted-foreground">Origen: {actividad.origen.fuente}</p>
            {actividad.origen.referencias.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Sustentada en: {actividad.origen.referencias.join(" · ")}
              </p>
            )}
          </div>
          {actividad.estado === "pendiente" && (
            <Button onClick={() => iniciar(actividad.id)}>
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Comenzar la ejecución
            </Button>
          )}
          {actividad.estado === "requiere_ajustes" && (
            <Button variant="outline" onClick={() => retomar(actividad.id)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retomar para hacer los ajustes
            </Button>
          )}
        </CardContent>
      </Card>

      <PanelInstrumento
        actividad={actividad}
        onAlternarPaso={(orden, hecho) => alternarPaso(actividad.id, orden, hecho)}
      />

      {actividad.profundizacion && (
        <PanelChecklist
          profundizacion={actividad.profundizacion}
          onMarcar={(verificacionId, estado) =>
            revisarVerificacion(actividad.id, verificacionId, estado)
          }
        />
      )}

      {puedeEntregar(actividad.estado) ? (
        <FormularioEntrega
          actividad={actividad}
          onEntregar={(entrada) => {
            const entrega = entregar(actividad.id, entrada);
            if (!entrega) return;
            if (entrega.revision.veredicto === "validado") {
              toast.success("Actividad validada", { description: entrega.revision.mensaje });
            } else {
              toast.warning("La revisión pide ajustes", { description: entrega.revision.mensaje });
            }
          }}
        />
      ) : (
        <Card>
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-base">{actividad.entregable.titulo}</CardTitle>
            <CardDescription>{actividad.entregable.descripcion}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {actividad.entregable.criteriosValidacion.map((criterio) => (
                <li key={criterio} className="flex gap-2">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  {criterio}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <HistorialEntregas historial={actividad.historial} />
    </div>
  );
}
