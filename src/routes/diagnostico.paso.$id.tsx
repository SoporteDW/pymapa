import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { CampoPregunta } from "@/components/diagnostico/campo-pregunta";
import { ProgresoDiagnostico } from "@/components/diagnostico/progreso-diagnostico";
import { IndicadorGuardado } from "@/components/diagnostico/indicador-guardado";
import { ConfiguracionInvalida } from "@/components/diagnostico/configuracion-invalida";
import { useDiagnostico } from "@/hooks/use-diagnostico";
import { useCuestionario } from "@/hooks/use-cuestionario";
import { useEstadoDiagnostico } from "@/hooks/use-estado-diagnostico";
import { PedirAMiEmpresa } from "@/components/colaboracion/pedir-a-mi-empresa";
import { Badge } from "@/components/ui/badge";
import {
  indiceDePregunta,
  obtenerDimension,
  obtenerPregunta,
  preguntasEnOrden,
} from "@/lib/diagnostico/definicion";
import { valorValido } from "@/lib/diagnostico/validacion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Clock, HelpCircle, Lock, SearchX } from "lucide-react";

export const Route = createFileRoute("/diagnostico/paso/$id")({
  head: () => ({
    meta: [
      { title: "Pregunta del diagnóstico — pymapa" },
      {
        name: "description",
        content:
          "Responde cada pregunta del diagnóstico. Guardamos tu avance automáticamente en este navegador.",
      },
      { property: "og:title", content: "Pregunta del diagnóstico — pymapa" },
      {
        property: "og:description",
        content:
          "Responde cada pregunta del diagnóstico. Guardamos tu avance automáticamente en este navegador.",
      },
    ],
  }),
  component: PreguntaDiagnosticoPage,
});

function PreguntaDiagnosticoPage() {
  const { id } = useParams({ from: "/diagnostico/paso/$id" });
  const navigate = useNavigate();
  const {
    isHydrated,
    configuracionValida,
    problemasConfiguracion,
    progreso,
    valorDe,
    responder,
    marcarPreguntaActual,
    pausar,
    estadoGuardado,
    reintentarGuardado,
  } = useDiagnostico();

  const { alternarAplazamiento, estaAplazada, delegadas } = useCuestionario();
  const { cerrado: diagnosticoCerrado } = useEstadoDiagnostico();

  const pregunta = obtenerPregunta(id);
  const indice = indiceDePregunta(id);

  useEffect(() => {
    if (!isHydrated || !pregunta) return;
    marcarPreguntaActual(pregunta.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, pregunta?.id]);

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  // Solo lectura tras el cierre formal: el diagnóstico emitido es un registro.
  if (diagnosticoCerrado) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Tu diagnóstico ya está cerrado"
          subtitulo="Las respuestas quedaron como registro de la conclusión emitida y no pueden modificarse."
          migas={[
            { label: "Inicio", to: "/inicio" },
            { label: "Diagnóstico", to: "/diagnostico" },
            { label: "Solo lectura" },
          ]}
        />
        <Card>
          <CardHeader className="space-y-2">
            <Badge variant="outline" className="w-fit gap-1.5 rounded-full">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Solo lectura
            </Badge>
            <CardTitle className="text-base">Puedes consultar, no editar</CardTitle>
            <CardDescription>
              Revisa tus respuestas y el informe emitido, o continúa con tu plan de acción.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => navigate({ to: "/diagnostico/revision" })}>
              Ver mis respuestas
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/diagnostico/listo" })}>
              Ver mi diagnóstico final
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!configuracionValida) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Diagnóstico digital"
          migas={[{ label: "Inicio", to: "/inicio" }, { label: "Diagnóstico" }]}
        />
        <ConfiguracionInvalida problemas={problemasConfiguracion} />
      </div>
    );
  }

  if (!pregunta) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Esta pregunta no existe"
          subtitulo="La pregunta que intentas abrir no forma parte del diagnóstico."
          migas={[
            { label: "Inicio", to: "/inicio" },
            { label: "Diagnóstico", to: "/diagnostico" },
            { label: "Pregunta no encontrada" },
          ]}
        />
        <EmptyState
          title="No encontramos esta pregunta"
          description="Vuelve al diagnóstico para continuar desde donde te quedaste."
          icon={SearchX}
          actionLabel="Volver al diagnóstico"
          onAction={() => navigate({ to: "/diagnostico" })}
        />
      </div>
    );
  }

  const dimension = pregunta.dimensionId ? obtenerDimension(pregunta.dimensionId) : undefined;
  const seccion = dimension ? dimension.nombre : "Contexto de la empresa";
  const anterior = indice > 0 ? preguntasEnOrden[indice - 1] : undefined;
  const siguiente = indice < preguntasEnOrden.length - 1 ? preguntasEnOrden[indice + 1] : undefined;
  const valor = valorDe(pregunta.id);
  const valida = valorValido(pregunta, valor);

  const handleSiguiente = () => {
    if (!valida) return;
    if (siguiente) {
      navigate({ to: "/diagnostico/paso/$id", params: { id: siguiente.id } });
    } else {
      navigate({ to: "/diagnostico/revision" });
    }
  };

  const handleAtras = () => {
    if (anterior) {
      navigate({ to: "/diagnostico/paso/$id", params: { id: anterior.id } });
      return;
    }
    navigate({ to: "/diagnostico" });
  };

  const handleAplazar = () => {
    if (!estaAplazada(pregunta.id)) {
      alternarAplazamiento(pregunta.id);
      toast.success("Marcamos esta pregunta para volver más tarde.", {
        description: "No bloquea el resto del diagnóstico: seguimos con la siguiente.",
      });
    }
    if (siguiente) {
      navigate({ to: "/diagnostico/paso/$id", params: { id: siguiente.id } });
    } else {
      navigate({ to: "/diagnostico/revision" });
    }
  };

  const handleSalir = () => {
    pausar();
    toast.success("Guardamos tu avance en este navegador.", {
      description: "Puedes continuar el diagnóstico cuando quieras.",
    });
    navigate({ to: "/inicio" });
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      <PageHeader
        titulo={seccion}
        subtitulo={
          dimension
            ? dimension.proposito
            : "Cuatro preguntas breves para entender el contexto de tu empresa."
        }
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Diagnóstico", to: "/diagnostico" },
          { label: `Pregunta ${indice + 1}` },
        ]}
      />

      <ProgresoDiagnostico
        respondidas={progreso.respondidas}
        total={progreso.total}
        porcentaje={progreso.porcentaje}
        seccion={`${seccion} · pregunta ${indice + 1} de ${preguntasEnOrden.length}`}
      />

      <IndicadorGuardado estado={estadoGuardado} onReintentar={reintentarGuardado} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">{pregunta.texto}</CardTitle>
          {pregunta.ayuda && (
            <CardDescription id={`${pregunta.id}-ayuda`} className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
              <span>{pregunta.ayuda}</span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {(estaAplazada(pregunta.id) || delegadas[pregunta.id]) && (
            <div className="flex flex-wrap items-center gap-2">
              {estaAplazada(pregunta.id) && (
                <Badge variant="outline" className="rounded-full">
                  <Clock className="size-3" aria-hidden="true" />
                  Marcada para responder más tarde
                </Badge>
              )}
              {delegadas[pregunta.id] && (
                <Badge variant="secondary" className="rounded-full">
                  Pedida a {delegadas[pregunta.id]}
                </Badge>
              )}
            </div>
          )}

          <CampoPregunta
            pregunta={pregunta}
            valor={valor}
            onChange={(nuevo) => responder(pregunta.id, nuevo)}
          />

          {/* Macroentrega 5 · Interrumpir sin abandonar: aplazar o pedir el dato a otra persona. */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={handleAplazar}>
              <Clock className="size-4" aria-hidden="true" />
              No lo sé ahora
            </Button>
            <PedirAMiEmpresa
              origen={{
                tipo: "pregunta",
                referenciaId: pregunta.id,
                referenciaTitulo: pregunta.texto,
                dominioId: pregunta.dimensionId ?? "contexto",
                dominioNombre: seccion,
                rutaRetorno: `/diagnostico/paso/${pregunta.id}`,
              }}
              tareaSugerida={`Necesitamos este dato: ${pregunta.texto}`}
              label="Pedir este dato a mi equipo"
            />
          </div>

          <div className="hidden flex-col gap-2 sm:flex sm:flex-row sm:items-center sm:justify-between">

            <Button variant="outline" onClick={handleAtras}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Atrás
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="ghost" onClick={handleSalir}>
                Salir y continuar después
              </Button>
              <Button onClick={handleSiguiente} disabled={!valida}>
                {siguiente ? "Siguiente" : "Ir a la revisión"}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-border bg-background/95 p-3 backdrop-blur sm:hidden">
        <Button variant="outline" className="flex-1" onClick={handleAtras}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Atrás
        </Button>
        <Button className="flex-1" onClick={handleSiguiente} disabled={!valida}>
          {siguiente ? "Siguiente" : "Revisión"}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
