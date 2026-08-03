import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { useSesion } from "@/hooks/use-sesion";
import { pasosDiagnostico, preguntasDePaso } from "@/data/mocks/diagnostico";
import { ClipboardList, Pencil } from "lucide-react";

export const Route = createFileRoute("/diagnostico/revision")({
  head: () => ({
    meta: [
      { title: "Revisión de respuestas — Pyme Digital" },
      {
        name: "description",
        content: "Verifica y corrige tus respuestas antes de generar los resultados.",
      },
      { property: "og:title", content: "Revisión de respuestas — Pyme Digital" },
      {
        property: "og:description",
        content: "Verifica y corrige tus respuestas antes de generar los resultados.",
      },
    ],
  }),
  component: RevisionPage,
});

function RevisionPage() {
  const navigate = useNavigate();
  const { sesion, isHydrated } = useSesion();

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  if (sesion.respuestas.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Revisión de respuestas"
          subtitulo="Aquí verás tus respuestas cuando avances en el diagnóstico."
          migas={[
            { label: "Inicio", to: "/inicio" },
            { label: "Diagnóstico", to: "/diagnostico" },
            { label: "Revisión" },
          ]}
        />
        <EmptyState
          title="Todavía no hay respuestas"
          description="Completa al menos una etapa del diagnóstico para poder revisarla."
          icon={ClipboardList}
          actionLabel="Ir al diagnóstico"
          onAction={() => navigate({ to: "/diagnostico" })}
        />
      </div>
    );
  }

  const completo = sesion.respuestas.length >= pasosDiagnostico.length;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Revisión de respuestas"
        subtitulo="Verifica lo que respondiste. Puedes corregir cualquier etapa antes de continuar."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Diagnóstico", to: "/diagnostico" },
          { label: "Revisión" },
        ]}
      />

      <div className="space-y-3">
        {pasosDiagnostico.map((paso) => {
          const pregunta = preguntasDePaso(paso.id)[0];
          const respuesta = pregunta
            ? sesion.respuestas.find((r) => r.preguntaId === pregunta.id)
            : undefined;
          const etiqueta =
            pregunta?.opciones?.find((o) => String(o.valor) === String(respuesta?.valor))?.etiqueta;

          return (
            <Card key={paso.id}>
              <CardHeader className="pb-3">
                <CardDescription>
                  Etapa {paso.numero} · {paso.titulo}
                </CardDescription>
                <CardTitle className="text-base font-medium">{pregunta?.texto}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-foreground">
                  {etiqueta ?? (
                    <span className="text-muted-foreground">Sin responder todavía</span>
                  )}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/diagnostico/paso/$id" params={{ id: String(paso.numero) }}>
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    Editar
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!completo && (
        <div className="rounded-lg border border-warning/20 bg-warning/5 p-4 text-sm text-warning-foreground">
          Faltan etapas por responder. Puedes generar resultados demostrativos igualmente, pero
          serán menos representativos.
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" asChild>
          <Link to="/diagnostico">Volver al diagnóstico</Link>
        </Button>
        <Button size="lg" onClick={() => navigate({ to: "/diagnostico/procesando" })}>
          Generar resultados demostrativos
        </Button>
      </div>

      <DemoNote>
        Los resultados que verás son ilustrativos y sirven para validar el recorrido. El cálculo
        real de madurez digital llegará en un paquete posterior.
      </DemoNote>
    </div>
  );
}
