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
import { ComoFuncionaDialog } from "@/components/recorrido/como-funciona-dialog";
import { useSesion } from "@/hooks/use-sesion";
import { ctaRecorrido, estadoEtapas, etapas } from "@/lib/recorrido";
import {
  avanceEtapas,
  avanceModulos,
  etiquetaEstadoModulo,
  modulosDeEtapa,
} from "@/lib/recorrido-modulos";


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
      { title: "Inicio — pymapa" },
      {
        name: "description",
        content:
          "Tu punto de partida: revisa el estado de tu empresa y descubre cuál es tu siguiente paso.",
      },
      { property: "og:title", content: "Inicio — pymapa" },
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

  const cta = ctaRecorrido(sesion);
  const estados = estadoEtapas(sesion);
  const avances = avanceModulos(sesion);
  const avanceEtapa = avanceEtapas(sesion);


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
        titulo={nombreEmpresa ? `Hola, ${nombreEmpresa}` : "Bienvenido a pymapa"}
        subtitulo={
          nombreEmpresa
            ? "Este es el estado de tu recorrido de transformación digital."
            : "Te acompañamos paso a paso para ordenar y avanzar en tu transformación digital."
        }
      />

      <Card className="overflow-hidden border-0 bg-brand-gradient text-primary-foreground shadow-suave">
        <div className="bg-patron-marca">
          <CardHeader className="gap-2 p-8">
            <CardDescription className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/80">
              {cta.kicker}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold sm:text-3xl">{cta.titulo}</CardTitle>
            <CardDescription className="max-w-xl text-primary-foreground/85">
              {cta.descripcion}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 p-8 pt-0">
            <Button asChild size="lg" variant="secondary">
              <Link to={cta.ruta}>
                {cta.label}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <ComoFuncionaDialog />
            <span className="text-xs text-primary-foreground/80">{cta.hint}</span>
          </CardContent>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿Para qué sirve pymapa?</CardTitle>
          <CardDescription>
            pymapa es un modelo de transformación digital autogestionado: con un diagnóstico guiado
            entendemos el punto de partida de tu empresa, traducimos ese resultado en prioridades
            claras y lo convertimos en un plan de acción con seguimiento. Avanzas a tu ritmo y
            puedes guardar y retomar el recorrido en cualquier momento.
          </CardDescription>
        </CardHeader>
      </Card>

      {perfilIncompleto && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning/5 p-4 text-sm text-warning-foreground sm:flex-row sm:items-center sm:justify-between">
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

      <section aria-labelledby="mapa-recorrido" className="space-y-4">
        <div>
          <h2 id="mapa-recorrido" className="text-lg font-semibold text-foreground">
            Tu recorrido paso a paso
          </h2>
          <p className="text-sm text-muted-foreground">
            El recorrido tiene cinco etapas. Dentro de cada etapa trabajas con los módulos de la
            plataforma que la componen.
          </p>
        </div>
        <JourneyMap estados={estados} />
        <ol className="space-y-3">
          {etapas.map((etapa) => {
            const modulos = modulosDeEtapa(etapa.id);
            const avance = avanceEtapa[etapa.id];
            return (
              <li
                key={etapa.id}
                className="rounded-xl border border-border bg-card p-4 shadow-suave"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    Etapa {etapa.numero} · {etapa.titulo}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {etiquetaEstadoModulo[avance.estado]} · {avance.porcentaje}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{etapa.descripcion}</p>
                <Progress
                  value={avance.porcentaje}
                  className="mt-3"
                  aria-label={`Avance de la etapa ${etapa.titulo}`}
                />
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {modulos.map((modulo) => {
                    const am = avances[modulo.id];
                    return (
                      <li key={modulo.id}>
                        <Link
                          to={modulo.ruta}
                          className="flex flex-col gap-1 rounded-lg border border-border/70 bg-background p-3 transition-colors hover:border-primary/40"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">
                              Módulo {modulo.numero} · {modulo.label}
                            </span>
                            <span className="text-xs font-semibold text-primary">
                              {am.porcentaje}%
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {etiquetaEstadoModulo[am.estado]}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
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
