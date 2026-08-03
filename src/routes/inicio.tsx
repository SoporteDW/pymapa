import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { JourneyMap } from "@/components/recorrido/journey-map";
import { useSesion } from "@/hooks/use-sesion";
import { estadoEtapas, siguientePaso } from "@/lib/recorrido";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  ListTodo,
  UserRound,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/inicio")({
  head: () => ({
    meta: [
      { title: "Inicio — Pyme Digital" },
      {
        name: "description",
        content:
          "Tu punto de partida: revisa el estado de tu empresa y descubre cuál es tu siguiente paso.",
      },
      { property: "og:title", content: "Inicio — Pyme Digital" },
      {
        property: "og:description",
        content:
          "Tu punto de partida: revisa el estado de tu empresa y descubre cuál es tu siguiente paso.",
      },
    ],
  }),
  component: InicioPage,
});

function InicioPage() {
  const { sesion, isHydrated } = useSesion();

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const paso = siguientePaso(sesion);
  const estados = estadoEtapas(sesion);
  const perfilIncompleto = !sesion.perfilCompletado || !sesion.empresa.nombre.trim();
  const nombreEmpresa = sesion.empresa.nombre.trim();
  const respuestasCompletadas =
    sesion.diagnostico.respondidasObligatorias ?? sesion.respuestas.length;
  const totalPasos = sesion.diagnostico.totalPreguntas ?? sesion.diagnostico.totalPasos;
  const accionesActivas = sesion.acciones.filter(
    (a) => a.estado === "pendiente" || a.estado === "en_progreso"
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        titulo={nombreEmpresa ? `Hola, ${nombreEmpresa}` : "Bienvenido a Pyme Digital"}
        subtitulo={
          nombreEmpresa
            ? "Este es el estado de tu recorrido de transformación digital."
            : "Te acompañamos en cinco etapas para ordenar y avanzar en tu transformación digital."
        }
        acciones={
          <Button variant="outline" asChild>
            <Link to="/ayuda">Cómo funciona</Link>
          </Button>
        }
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardDescription className="font-medium text-primary">Tu siguiente paso</CardDescription>
          <CardTitle className="text-xl">{paso.titulo}</CardTitle>
          <CardDescription>{paso.descripcion}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg">
            <Link to={paso.ruta}>
              {paso.accionLabel}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {perfilIncompleto && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/20 bg-warning/5 p-4 text-sm text-warning-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Tu perfil de empresa está incompleto. Con esos datos el recorrido resulta más claro.
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link to="/perfil">
              <UserRound className="mr-2 h-4 w-4" aria-hidden="true" />
              Completar perfil
            </Link>
          </Button>
        </div>
      )}

      <section aria-labelledby="mapa-recorrido" className="space-y-3">
        <h2 id="mapa-recorrido" className="text-lg font-semibold text-foreground">
          Tu recorrido en cinco etapas
        </h2>
        <JourneyMap estados={estados} />
      </section>

      <section aria-labelledby="resumen-estado" className="space-y-3">
        <h2 id="resumen-estado" className="text-lg font-semibold text-foreground">
          Resumen de tu estado
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <CardTitle className="text-base">Diagnóstico</CardTitle>
              <CardDescription>
                {sesion.diagnostico.estado === "completado"
                  ? "Completaste todas las preguntas del diagnóstico."
                  : sesion.diagnostico.estado === "en_progreso"
                    ? `Has respondido ${respuestasCompletadas} de ${totalPasos} preguntas.`
                    : "Aún no has iniciado el diagnóstico guiado."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress
                value={sesion.diagnostico.progreso}
                aria-label="Progreso del diagnóstico"
              />
              <Button variant="link" className="px-0" asChild>
                <Link to="/diagnostico">Ir al diagnóstico</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <CardTitle className="text-base">Prioridades</CardTitle>
              <CardDescription>
                {sesion.prioridades.length > 0
                  ? `Identificamos ${sesion.prioridades.length} prioridades ilustrativas para tu empresa.`
                  : "Las prioridades aparecerán cuando completes el diagnóstico."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="link" className="px-0" asChild>
                <Link to="/resultados">Ver resultados</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ListTodo className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <CardTitle className="text-base">Acciones</CardTitle>
              <CardDescription>
                {sesion.acciones.length > 0
                  ? `Tienes ${accionesActivas} acciones activas de ${sesion.acciones.length} propuestas.`
                  : "El plan de acción se construye a partir de tus resultados."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="link" className="px-0" asChild>
                <Link to="/plan-de-accion">Ver plan de acción</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="actividad-reciente" className="space-y-3">
        <h2 id="actividad-reciente" className="text-lg font-semibold text-foreground">
          Actividad reciente
        </h2>
        {sesion.actividad.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            Todavía no hay actividad. Cuando guardes tu perfil o avances en el diagnóstico, verás
            aquí un registro de tus cambios.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {sesion.actividad.slice(0, 4).map((act) => (
              <li key={act.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:justify-between">
                <span className="text-sm text-foreground">{act.descripcion}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(act.fecha), "d MMM yyyy · HH:mm", { locale: es })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DemoNote>
        Estás usando el MVP Alfa. Los resultados, prioridades y acciones son ilustrativos y sirven
        para validar el recorrido; la lógica definitiva de diagnóstico se incorporará en etapas
        posteriores.
      </DemoNote>
    </div>
  );
}
