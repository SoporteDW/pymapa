import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Stepper } from "@/components/ui/stepper";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useSesion } from "@/hooks/use-sesion";
import { pasosDiagnostico, preguntasDePaso } from "@/data/mocks/diagnostico";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, HelpCircle, Save, SearchX } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/diagnostico/paso/$id")({
  head: () => ({
    meta: [
      { title: "Paso del diagnóstico — Pyme Digital" },
      {
        name: "description",
        content: "Responde cada etapa del diagnóstico y guarda tu progreso cuando quieras.",
      },
      { property: "og:title", content: "Paso del diagnóstico — Pyme Digital" },
      {
        property: "og:description",
        content: "Responde cada etapa del diagnóstico y guarda tu progreso cuando quieras.",
      },
    ],
  }),
  component: PasoDiagnosticoPage,
});

function PasoDiagnosticoPage() {
  const { id } = useParams({ from: "/diagnostico/paso/$id" });
  const navigate = useNavigate();
  const { sesion, isHydrated, guardarPaso, marcarPasoActual } = useSesion();
  const numero = Number.parseInt(id, 10);
  const indice = numero - 1;
  const paso = pasosDiagnostico[indice];
  const pregunta = paso ? preguntasDePaso(paso.id)[0] : undefined;
  const [seleccion, setSeleccion] = useState<string>("");

  useEffect(() => {
    if (!isHydrated || !pregunta) return;
    const guardada = sesion.respuestas.find((r) => r.preguntaId === pregunta.id);
    setSeleccion(guardada ? String(guardada.valor) : "");
    marcarPasoActual(indice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, pregunta?.id]);

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  if (!paso || !pregunta) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Esta etapa no existe"
          subtitulo="La etapa que intentas abrir no forma parte del diagnóstico."
          migas={[
            { label: "Inicio", to: "/inicio" },
            { label: "Diagnóstico", to: "/diagnostico" },
            { label: "Etapa no encontrada" },
          ]}
        />
        <EmptyState
          title="No encontramos esta etapa"
          description="Vuelve al diagnóstico para continuar desde donde te quedaste."
          icon={SearchX}
          actionLabel="Volver al diagnóstico"
          onAction={() => navigate({ to: "/diagnostico" })}
        />
      </div>
    );
  }

  const esUltimo = numero >= pasosDiagnostico.length;
  const pasosStepper = pasosDiagnostico.map((p) => ({ id: p.id, label: p.titulo }));
  const ultimaRespuesta = sesion.respuestas.find((r) => r.preguntaId === pregunta.id);

  const guardar = () => {
    guardarPaso(
      {
        preguntaId: pregunta.id,
        valor: seleccion,
        fechaGuardado: new Date().toISOString(),
      },
      indice
    );
  };

  const handleContinuar = () => {
    if (!seleccion) return;
    guardar();
    if (esUltimo) {
      navigate({ to: "/diagnostico/revision" });
    } else {
      navigate({ to: "/diagnostico/paso/$id", params: { id: String(numero + 1) } });
    }
  };

  const handleAtras = () => {
    if (numero <= 1) {
      navigate({ to: "/diagnostico" });
      return;
    }
    navigate({ to: "/diagnostico/paso/$id", params: { id: String(numero - 1) } });
  };

  const handleSalir = () => {
    if (seleccion) guardar();
    toast.success("Guardamos tu avance en este navegador.", {
      description: "Puedes continuar el diagnóstico cuando quieras.",
    });
    navigate({ to: "/inicio" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={paso.titulo}
        subtitulo={`Etapa ${numero} de ${pasosDiagnostico.length} · ${paso.proposito}`}
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Diagnóstico", to: "/diagnostico" },
          { label: `Etapa ${numero}` },
        ]}
        acciones={
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Save className="h-4 w-4" aria-hidden="true" />
            {ultimaRespuesta ? "Respuesta guardada" : "Guardado automático"}
          </span>
        }
      />

      <Stepper steps={pasosStepper} currentStep={indice} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">{pregunta.texto}</CardTitle>
          {pregunta.ayuda && (
            <CardDescription className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
              <span>
                <strong className="font-medium">¿Por qué preguntamos esto?</strong> {pregunta.ayuda}
              </span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={seleccion} onValueChange={setSeleccion} className="space-y-3">
            {pregunta.opciones?.map((opcion) => (
              <div
                key={opcion.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
              >
                <RadioGroupItem value={String(opcion.valor)} id={opcion.id} />
                <Label htmlFor={opcion.id} className="flex-1 cursor-pointer text-sm font-normal">
                  {opcion.etiqueta}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={handleAtras}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Atrás
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="ghost" onClick={handleSalir}>
                Salir y continuar después
              </Button>
              <Button onClick={handleContinuar} disabled={!seleccion}>
                Guardar y continuar
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
