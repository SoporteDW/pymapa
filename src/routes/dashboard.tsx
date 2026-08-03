import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { JourneyMap } from "@/components/recorrido/journey-map";
import { useSesion } from "@/hooks/use-sesion";
import { etiquetaEstadoAccion, siguientePaso } from "@/lib/recorrido";
import { Activity, CheckCircle2, ClipboardList, Target } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Seguimiento — Pyme Digital" },
      {
        name: "description",
        content: "Sigue tu avance digital: etapas, acciones en curso y actividad reciente.",
      },
      { property: "og:title", content: "Seguimiento — Pyme Digital" },
      {
        property: "og:description",
        content: "Sigue tu avance digital: etapas, acciones en curso y actividad reciente.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { sesion, isHydrated } = useSesion();

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const paso = siguientePaso(sesion);
  const total = sesion.acciones.length;
  const completadas = sesion.acciones.filter((a) => a.estado === "completada").length;
  const enProgreso = sesion.acciones.filter((a) => a.estado === "en_progreso");
  const avance = total > 0 ? Math.round((completadas / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Seguimiento"
        subtitulo="Un lugar para ver tu avance y decidir el próximo movimiento."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Seguimiento" }]}
        acciones={
          <Button asChild>
            <Link to={paso.to}>{paso.etiqueta}</Link>
          </Button>
        }
      />

      <JourneyMap sesion={sesion} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Diagnóstico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-foreground">{sesion.diagnostico.progreso}%</p>
            <Progress
              value={sesion.diagnostico.progreso}
              aria-label="Avance del diagnóstico"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" aria-hidden="true" />
              Acciones del plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-sm text-muted-foreground">
              {sesion.prioridades.length} prioridades identificadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Acciones completadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-foreground">
              {completadas} de {total}
            </p>
            <Progress value={avance} aria-label="Avance del plan de acción" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acciones en curso</CardTitle>
          <CardDescription>
            Lo que está abierto hoy. Mantén pocas acciones activas a la vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enProgreso.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No tienes acciones en curso. Abre tu plan y comienza por la primera prioridad.
              <div className="mt-3">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/plan-de-accion">Ver plan de acción</Link>
                </Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {enProgreso.map((accion) => (
                <li
                  key={accion.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{accion.titulo}</p>
                    <p className="text-sm text-muted-foreground">{accion.duracionEstimada}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{etiquetaEstadoAccion[accion.estado]}</Badge>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/plan-de-accion/$accion" params={{ accion: accion.id }}>
                        Abrir
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
            Actividad reciente
          </CardTitle>
          <CardDescription>Registro local de lo que has hecho en el prototipo.</CardDescription>
        </CardHeader>
        <CardContent>
          {sesion.actividad.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay actividad registrada.</p>
          ) : (
            <ul className="space-y-3">
              {sesion.actividad.slice(0, 8).map((item) => (
                <li key={item.id} className="flex gap-3 text-sm">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-foreground">{item.descripcion}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.fecha).toLocaleString("es", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <DemoNote>
        Los indicadores de seguimiento son ilustrativos. La medición de avance real y la comparación
        entre diagnósticos se definirán en paquetes posteriores.
      </DemoNote>
    </div>
  );
}
