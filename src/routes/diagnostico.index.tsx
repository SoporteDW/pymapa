import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { useSesion } from "@/hooks/use-sesion";
import { pasosDiagnostico } from "@/data/mocks/diagnostico";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/diagnostico/")({
  head: () => ({
    meta: [
      { title: "Diagnóstico — Pyme Digital" },
      {
        name: "description",
        content:
          "Diagnóstico guiado en cinco etapas para conocer la situación digital de tu empresa.",
      },
      { property: "og:title", content: "Diagnóstico — Pyme Digital" },
      {
        property: "og:description",
        content:
          "Diagnóstico guiado en cinco etapas para conocer la situación digital de tu empresa.",
      },
    ],
  }),
  component: DiagnosticoEntrada,
});

function DiagnosticoEntrada() {
  const navigate = useNavigate();
  const { sesion, isHydrated, iniciarDiagnostico } = useSesion();

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const { diagnostico, respuestas } = sesion;
  const enProgreso = diagnostico.estado === "en_progreso";
  const completado = diagnostico.estado === "completado";
  const pasoRetomar = Math.min(respuestas.length + 1, diagnostico.totalPasos);

  const etiquetaPrimaria = completado
    ? "Revisar respuestas"
    : enProgreso
      ? "Continuar diagnóstico"
      : "Iniciar diagnóstico";

  const handlePrimaria = () => {
    if (completado) {
      navigate({ to: "/diagnostico/revision" });
      return;
    }
    iniciarDiagnostico();
    navigate({ to: "/diagnostico/paso/$id", params: { id: String(pasoRetomar) } });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Diagnóstico digital"
        subtitulo="Cinco etapas breves para entender dónde está tu empresa hoy."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Diagnóstico" }]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {completado
              ? "Tu diagnóstico está completo"
              : enProgreso
                ? "Retoma donde lo dejaste"
                : "Antes de empezar"}
          </CardTitle>
          <CardDescription>
            {completado
              ? "Puedes revisar o corregir tus respuestas cuando quieras."
              : enProgreso
                ? `Has completado ${respuestas.length} de ${diagnostico.totalPasos} etapas. Continuarás en la etapa ${pasoRetomar}.`
                : "Responde con lo que mejor describa tu situación actual. No hay respuestas correctas ni incorrectas."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Tiempo estimado: 5 minutos
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Guardado automático en este navegador
            </span>
          </div>
          <Progress value={diagnostico.progreso} aria-label="Progreso del diagnóstico" />
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={handlePrimaria}>
              {etiquetaPrimaria}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
            {respuestas.length > 0 && !completado && (
              <Button variant="outline" size="lg" asChild>
                <Link to="/diagnostico/revision">Revisar respuestas</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="etapas-diagnostico" className="space-y-3">
        <h2 id="etapas-diagnostico" className="text-lg font-semibold text-foreground">
          Qué vamos a revisar
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {pasosDiagnostico.map((paso, index) => {
            const respondido = respuestas.length > index;
            return (
              <li
                key={paso.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
              >
                <span
                  className={
                    respondido
                      ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-xs font-semibold text-success-foreground"
                      : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                  }
                >
                  {paso.numero}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{paso.titulo}</p>
                  <p className="text-sm text-muted-foreground">{paso.proposito}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <DemoNote variant="aviso">
        Este es un diagnóstico demostrativo del MVP Alfa. El banco definitivo de preguntas y la
        lógica de evaluación se incorporarán en un paquete posterior.
      </DemoNote>
    </div>
  );
}
