import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSesion } from "@/hooks/use-sesion";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity, CheckCircle2, Clock, LayoutDashboard, ListTodo, Target } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Pyme Digital" },
      { name: "description", content: "Resumen del avance de transformación digital de tu empresa." },
      { property: "og:title", content: "Dashboard — Pyme Digital" },
      { property: "og:description", content: "Resumen del avance de transformación digital de tu empresa." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { sesion, isHydrated } = useSesion();

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const totalAcciones = sesion.acciones.length;
  const accionesEnProgreso = sesion.acciones.filter((a) => a.estado === "en_progreso").length;
  const accionesCompletadas = sesion.acciones.filter((a) => a.estado === "completada").length;
  const progresoDiagnostico = sesion.diagnostico.progreso;

  if (totalAcciones === 0) {
    return (
      <EmptyState
        title="Dashboard vacío"
        description="Aún no hay datos suficientes para mostrar un resumen. Completa el diagnóstico primero."
        icon={LayoutDashboard}
        actionLabel="Ir al diagnóstico"
        onAction={() => {
          window.location.href = "/diagnostico";
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen del avance de {sesion.empresa.nombre}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progreso del diagnóstico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progresoDiagnostico}%</div>
            <Progress value={progresoDiagnostico} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acciones totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAcciones}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accionesEnProgreso}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accionesCompletadas}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-primary" aria-hidden="true" />
              Distribución por prioridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["alta", "media", "baja"].map((prioridad) => {
                const count = sesion.acciones.filter((a) => a.prioridad === prioridad).length;
                return (
                  <div key={prioridad} className="flex items-center gap-3">
                    <Badge variant={prioridad === "alta" ? "destructive" : prioridad === "media" ? "secondary" : "outline"}>
                      {prioridad}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{count} acciones</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
              Actividad reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sesion.actividad.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay actividad registrada.</p>
            ) : (
              <ul className="space-y-3">
                {sesion.actividad.slice(0, 5).map((act) => (
                  <li key={act.id} className="flex items-start gap-3 text-sm">
                    {act.tipo === "diagnostico" && <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" aria-hidden="true" />}
                    {act.tipo === "perfil" && <Clock className="mt-0.5 h-4 w-4 text-info" aria-hidden="true" />}
                    {act.tipo === "sistema" && <ListTodo className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                    <div>
                      <p className="text-foreground">{act.descripcion}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(act.fecha), "d MMM yyyy · HH:mm", { locale: es })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-warning/20 bg-warning/5 p-4 text-sm text-warning-foreground">
        <p>
          <strong>Datos ilustrativos:</strong> El dashboard muestra información simulada. Los indicadores productivos reales se habilitarán en una siguiente etapa.
        </p>
      </div>
    </div>
  );
}
