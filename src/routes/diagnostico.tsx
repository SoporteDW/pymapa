import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Stepper } from "@/components/ui/stepper";
import { LoadingState } from "@/components/ui/loading-state";
import { useSesion } from "@/hooks/use-sesion";
import { preguntasDemo } from "@/data/mocks/diagnostico";
import { ArrowLeft, ArrowRight, HelpCircle, Save } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/diagnostico")({
  head: () => ({
    meta: [
      { title: "Diagnóstico — Pyme Digital" },
      { name: "description", content: "Responde preguntas simples sobre tu empresa para conocer tu situación digital." },
      { property: "og:title", content: "Diagnóstico — Pyme Digital" },
      { property: "og:description", content: "Responde preguntas simples sobre tu empresa para conocer tu situación digital." },
    ],
  }),
  component: DiagnosticoPage,
});

const steps = [
  { id: "s1", label: "Estrategia" },
  { id: "s2", label: "Procesos" },
  { id: "s3", label: "Presencia" },
  { id: "s4", label: "Datos" },
  { id: "s5", label: "Equipo" },
];

function DiagnosticoPage() {
  const { sesion, isHydrated, saveRespuesta, updateDiagnostico } = useSesion();
  const [currentStep, setCurrentStep] = useState(sesion.diagnostico.pasoActual || 0);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const pregunta = preguntasDemo[currentStep];
  const progress = Math.round(((currentStep + 1) / preguntasDemo.length) * 100);

  const handleNext = () => {
    if (!selected) return;
    setSaving(true);
    saveRespuesta({
      preguntaId: pregunta.id,
      valor: selected,
      fechaGuardado: new Date().toISOString(),
    });
    setTimeout(() => {
      const nextStep = Math.min(currentStep + 1, preguntasDemo.length - 1);
      setCurrentStep(nextStep);
      updateDiagnostico({
        ...sesion.diagnostico,
        pasoActual: nextStep,
        progreso: progress,
        estado: nextStep === preguntasDemo.length - 1 ? "completado" : "en_progreso",
      });
      setSelected(null);
      setSaving(false);
    }, 400);
  };

  const handleBack = () => {
    const prevStep = Math.max(currentStep - 1, 0);
    setCurrentStep(prevStep);
    updateDiagnostico({
      ...sesion.diagnostico,
      pasoActual: prevStep,
      progreso: Math.round((prevStep / preguntasDemo.length) * 100),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Diagnóstico digital</h1>
          <p className="text-sm text-muted-foreground">
            Tiempo estimado: 5 minutos · Pregunta {currentStep + 1} de {preguntasDemo.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Save className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">{saving ? "Guardando…" : "Guardado automático"}</span>
        </div>
      </div>

      <Stepper steps={steps} currentStep={currentStep} />

      <Card>
        <CardHeader>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <span>{pregunta.seccion}</span>
          </div>
          <CardTitle className="text-lg font-medium">{pregunta.texto}</CardTitle>
          {pregunta.ayuda && (
            <CardDescription className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
              <span>{pregunta.ayuda}</span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={selected || ""} onValueChange={setSelected} className="space-y-3">
            {pregunta.opciones?.map((opcion) => (
              <div
                key={opcion.id}
                className="flex items-center space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
              >
                <RadioGroupItem value={String(opcion.valor)} id={opcion.id} />
                <Label htmlFor={opcion.id} className="flex-1 cursor-pointer text-sm font-normal">
                  {opcion.etiqueta}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              aria-label="Pregunta anterior"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Atrás
            </Button>
            <Button onClick={handleNext} disabled={!selected || saving}>
              {currentStep === preguntasDemo.length - 1 ? "Finalizar" : "Guardar y continuar"}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-warning/20 bg-warning/5 p-4 text-sm text-warning-foreground">
        <p>
          <strong>Datos demostrativos:</strong> Las preguntas y respuestas son de ejemplo. El motor de diagnóstico real se construirá en un siguiente paquete.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link to="/inicio">Salir al inicio</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/resultados">Ver resultados simulados</Link>
        </Button>
      </div>
    </div>
  );
}
