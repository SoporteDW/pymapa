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
import {
  indiceDePregunta,
  obtenerDimension,
  obtenerPregunta,
  preguntasEnOrden,
} from "@/lib/diagnostico/definicion";
import { valorValido } from "@/lib/diagnostico/validacion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, HelpCircle, SearchX } from "lucide-react";

export const Route = createFileRoute("/diagnostico/paso/$id")({
  head: () => ({
    meta: [
      { title: "Pregunta del diagnóstico — Pyme Digital" },
      {
        name: "description",
        content:
          "Responde cada pregunta del diagnóstico. Guardamos tu avance automáticamente en este navegador.",
      },
      { property: "og:title", content: "Pregunta del diagnóstico — Pyme Digital" },
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
          <CampoPregunta
            pregunta={pregunta}
            valor={valor}
            onChange={(nuevo) => responder(pregunta.id, nuevo)}
          />

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
