import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { EtapaFooter, EtapaProgreso } from "@/components/recorrido/etapa-nav";
import { ProgresoDiagnostico } from "@/components/diagnostico/progreso-diagnostico";
import { ConfiguracionInvalida } from "@/components/diagnostico/configuracion-invalida";
import { IndicadorGuardado } from "@/components/diagnostico/indicador-guardado";
import { useDiagnostico } from "@/hooks/use-diagnostico";
import { useModoDemo } from "@/hooks/use-modo-demo";
import { useEstadoDiagnostico } from "@/hooks/use-estado-diagnostico";
import { AutocompletarEtapa } from "@/components/demo/autocompletar-etapa";
import { registrarEvento } from "@/lib/analytics";
import { toast } from "sonner";
import { dimensiones, totalPreguntasObligatorias } from "@/lib/diagnostico/definicion";
import { ArrowRight, CheckCircle2, Clock, RotateCcw, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/diagnostico/")({
  head: () => ({
    meta: [
      { title: "Diagnóstico digital — pymapa" },
      {
        name: "description",
        content:
          "Responde 28 preguntas guiadas sobre seis dimensiones y obtén un puntaje preliminar de madurez digital.",
      },
      { property: "og:title", content: "Diagnóstico digital — pymapa" },
      {
        property: "og:description",
        content:
          "Responde 28 preguntas guiadas sobre seis dimensiones y obtén un puntaje preliminar de madurez digital.",
      },
    ],
  }),
  component: DiagnosticoEntrada,
});

function DiagnosticoEntrada() {
  const navigate = useNavigate();
  const {
    isHydrated,
    configuracionValida,
    problemasConfiguracion,
    sesion,
    progreso,
    completo,
    resultado,
    estadoGuardado,
    reintentarGuardado,
    comenzar,
    reanudar,
    reiniciar,
    responderLote,
  } = useDiagnostico();
  const { puedeAutocompletar, perfil: perfilDemo } = useModoDemo();
  const { journey } = useEstadoDiagnostico();
  const [confirmando, setConfirmando] = useState(false);

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const encabezado = (
    <PageHeader
      titulo="Diagnóstico digital"
      subtitulo="Un recorrido guiado por seis dimensiones para conocer el punto de partida de tu empresa."
      migas={[{ label: "Inicio", to: "/inicio" }, { label: "Diagnóstico" }]}
    />
  );

  if (!configuracionValida) {
    return (
      <div className="space-y-6">
        {encabezado}
        <ConfiguracionInvalida problemas={problemasConfiguracion} />
      </div>
    );
  }

  const hayAvance = progreso.respondidas > 0;
  const finalizado = sesion.status === "completed" && resultado !== null;
  // Con el cuestionario completo el journey manda: nunca se vuelve a pedir
  // responder preguntas (Macroentrega 4.1).
  const cuestionarioCompleto = journey.cuestionario.completo;

  const handleComenzar = () => {
    const primera = comenzar();
    navigate({ to: "/diagnostico/paso/$id", params: { id: primera } });
  };

  const handleContinuar = () => {
    const destino = reanudar();
    navigate({ to: "/diagnostico/paso/$id", params: { id: destino } });
  };

  /** Modo demo paso a paso: aplica las respuestas del dataset simulado. */
  const handleAutocompletar = () => {
    if (!perfilDemo) return;
    const aplicadas = responderLote(perfilDemo.respuestas);
    registrarEvento("demo_stage_autofilled", {
      etapa: "diagnostico",
      profileId: perfilDemo.id,
      respuestas: aplicadas,
    });
    toast.info(`Diligenciamos ${aplicadas} respuestas con datos simulados.`, {
      description: "Revisa las respuestas antes de continuar al resumen.",
    });
  };

  return (
    <div className="space-y-6">
      {encabezado}

      <EtapaProgreso modulo="diagnostico" />

      {puedeAutocompletar && perfilDemo && (
        <AutocompletarEtapa
          onAutocompletar={handleAutocompletar}
          empresaDemo={perfilDemo.nombre}
          descripcion={`Puedes responder el diagnóstico con las respuestas simuladas de ${perfilDemo.nombre} y revisarlas antes de continuar.`}
        />
      )}


      <IndicadorGuardado estado={estadoGuardado} onReintentar={reintentarGuardado} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {cuestionarioCompleto
              ? journey.titulo
              : hayAvance
                ? "Continuar diagnóstico"
                : "Antes de comenzar"}
          </CardTitle>
          <CardDescription>
            {cuestionarioCompleto
              ? journey.descripcion
              : hayAvance
                ? `Has respondido ${progreso.respondidas} de ${progreso.total} preguntas. Retomarás donde te quedaste.`
                : "Responde con lo que mejor describa tu situación actual. No hay respuestas correctas ni incorrectas."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Duración estimada: 10 a 15 minutos
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {totalPreguntasObligatorias} preguntas, todas obligatorias
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Tus respuestas quedan solo en este navegador
            </span>
          </div>

          {hayAvance && (
            <ProgresoDiagnostico
              respondidas={journey.cuestionario.respondidas}
              total={journey.cuestionario.total}
              porcentaje={journey.cuestionario.porcentaje}
            />
          )}

          {cuestionarioCompleto && journey.profundizacion.total > 0 && (
            <p className="text-sm text-foreground">
              Profundización: {journey.profundizacion.completadas} de{" "}
              {journey.profundizacion.total} aspectos confirmados.
            </p>
          )}


          {sesion.updatedAt && hayAvance && (
            <p className="text-xs text-muted-foreground">
              Último guardado:{" "}
              {format(new Date(sesion.updatedAt), "d MMM yyyy · HH:mm", { locale: es })}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {cuestionarioCompleto ? (
              <Button size="lg" asChild>
                <Link to={journey.siguiente.ruta}>
                  {journey.siguiente.label}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : hayAvance ? (
              <Button size="lg" onClick={handleContinuar}>
                Continuar diagnóstico
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button size="lg" onClick={handleComenzar}>
                Comenzar diagnóstico
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            )}

            {(finalizado || cuestionarioCompleto) && (
              <Button variant="outline" size="lg" asChild>
                <Link to="/diagnostico/resumen">Ver resultado preliminar</Link>
              </Button>
            )}

            {hayAvance && (
              <Button variant="ghost" size="lg" asChild>
                <Link to="/diagnostico/revision">Revisar respuestas</Link>
              </Button>
            )}

            {hayAvance && (
              <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="lg">
                    <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                    Reiniciar diagnóstico
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Reiniciar el diagnóstico?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminará todo el avance guardado en este navegador, incluidas tus
                      respuestas y el resultado preliminar. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        reiniciar();
                        setConfirmando(false);
                      }}
                    >
                      Sí, reiniciar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {completo && !finalizado && (
            <p className="text-sm text-foreground">
              Ya respondiste todas las preguntas. Puedes ir a la revisión final para confirmar el
              envío.
            </p>
          )}

          {cuestionarioCompleto && (
            <p className="text-xs text-muted-foreground">
              Tu cuestionario está completo ({journey.cuestionario.respondidas} de{" "}
              {journey.cuestionario.total}). Lo que falta no son preguntas, sino confirmar
              información con documentos o aclaraciones.
            </p>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="dimensiones-diagnostico" className="space-y-3">
        <h2 id="dimensiones-diagnostico" className="text-lg font-semibold text-foreground">
          Qué vamos a revisar
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {dimensiones.map((dimension, index) => (
            <li
              key={dimension.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{dimension.nombre}</p>
                <p className="text-sm text-muted-foreground">{dimension.proposito}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted-foreground">
          Antes de las dimensiones te haremos cuatro preguntas breves de contexto sobre tu empresa.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Diagnósticos especializados</CardTitle>
          <CardDescription>
            Análisis complementarios que profundizan un frente concreto del negocio digital. Son
            independientes: no modifican tus respuestas ni el puntaje del diagnóstico general.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Disponible: <span className="font-semibold text-foreground">Diagnóstico Inteligente ·
            E-commerce</span> (canal de venta digital, perfil tecnológico requerido, social selling y
            experiencia de compra), con hallazgos explicables y conversión directa a iniciativas del
            plan.
          </p>
          <Button variant="outline" asChild>
            <Link to="/diagnostico/especializados">
              Ver diagnósticos especializados
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <EtapaFooter modulo="diagnostico" />
    </div>
  );
}
