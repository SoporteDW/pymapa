import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { PanelTecnicoMotor } from "@/components/diagnostico/panel-tecnico-motor";
import { useDiagnostico } from "@/hooks/use-diagnostico";
import { useMotor } from "@/hooks/use-motor";
import { casosSimulados } from "@/lib/motor/casos-demo";
import { ejecutarMotor } from "@/lib/motor/motor";
import { DEFINITION_VERSION } from "@/lib/diagnostico/definicion";
import type { SalidaMotor } from "@/lib/motor/tipos";

export const Route = createFileRoute("/diagnostico/motor")({
  head: () => ({
    meta: [
      { title: "Validación del motor de conocimiento — pymapa" },
      {
        name: "description",
        content:
          "Vista técnica de validación: hallazgos, prioridades, reglas activadas y trazabilidad completa del motor de conocimiento.",
      },
      { property: "og:title", content: "Validación del motor de conocimiento — pymapa" },
      {
        property: "og:description",
        content:
          "Consulta la trazabilidad entre respuestas, señales, reglas, hallazgos y prioridades del diagnóstico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MotorPage,
});

function MotorPage() {
  const { isHydrated, sesion, respuestas, completo } = useDiagnostico();
  const { ejecutar, ejecutando, errorMotor, ultima, exportar } = useMotor();
  const [casoId, setCasoId] = useState<string>("");

  const salidaSimulada = useMemo<SalidaMotor | null>(() => {
    const caso = casosSimulados.find((c) => c.id === casoId);
    if (!caso) return null;
    return ejecutarMotor({
      diagnosisId: caso.diagnosisId,
      definitionVersion: DEFINITION_VERSION,
      respuestas: caso.respuestas,
    });
  }, [casoId]);

  useEffect(() => {
    if (!isHydrated || !completo || ultima) return;
    ejecutar({ diagnosisId: sesion.id, respuestas });
  }, [completo, ejecutar, isHydrated, respuestas, sesion.id, ultima]);

  if (!isHydrated) return <LoadingState fullPage />;

  const salida = salidaSimulada ?? ultima;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Validación del motor de conocimiento"
        subtitulo="Vista técnica para auditar la trazabilidad entre respuestas, reglas, hallazgos y prioridades."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Diagnóstico", to: "/diagnostico" },
          { label: "Motor de conocimiento" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Origen de los datos</CardTitle>
          <CardDescription>
            Puedes revisar tu propia ejecución o cargar uno de los escenarios simulados de prueba.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={casoId === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setCasoId("")}
            >
              Mi diagnóstico
            </Button>
            {casosSimulados.map((caso) => (
              <Button
                key={caso.id}
                variant={casoId === caso.id ? "default" : "outline"}
                size="sm"
                onClick={() => setCasoId(caso.id)}
              >
                {caso.id}
              </Button>
            ))}
          </div>
          {casoId !== "" && (
            <p className="text-sm text-muted-foreground">
              <strong className="font-medium text-foreground">
                {casosSimulados.find((c) => c.id === casoId)?.nombre}
              </strong>{" "}
              — {casosSimulados.find((c) => c.id === casoId)?.descripcion} Estos datos son
              simulados: sirven para validar el comportamiento del motor.
            </p>
          )}
          {errorMotor && (
            <p className="text-sm text-destructive">
              No fue posible ejecutar el motor (código {errorMotor}). Puedes reintentarlo.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!completo || ejecutando}
              onClick={() => ejecutar({ diagnosisId: sesion.id, respuestas })}
            >
              {ejecutando ? "Ejecutando…" : "Volver a ejecutar con mis respuestas"}
            </Button>
            {salida && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard?.writeText(exportar(salida));
                }}
              >
                Copiar salida en JSON
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!salida ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Todavía no hay una ejecución del motor. Completa el diagnóstico o selecciona un
            escenario simulado.
            <div className="mt-4">
              <Button asChild size="sm">
                <Link to="/diagnostico">Ir al diagnóstico</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PanelTecnicoMotor salida={salida} />
      )}
    </div>
  );
}
