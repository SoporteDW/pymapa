import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ProgresoDiagnostico } from "@/components/diagnostico/progreso-diagnostico";
import { IndicadorGuardado } from "@/components/diagnostico/indicador-guardado";
import { useDiagnostico } from "@/hooks/use-diagnostico";
import {
  dimensiones,
  etiquetaRespuesta,
  obtenerPregunta,
  preguntasEnOrden,
} from "@/lib/diagnostico/definicion";
import { ClipboardList, Pencil, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/diagnostico/revision")({
  head: () => ({
    meta: [
      { title: "Revisión final del diagnóstico — Pyme Digital" },
      {
        name: "description",
        content: "Verifica tus respuestas por dimensión antes de calcular tu resultado preliminar.",
      },
      { property: "og:title", content: "Revisión final del diagnóstico — Pyme Digital" },
      {
        property: "og:description",
        content: "Verifica tus respuestas por dimensión antes de calcular tu resultado preliminar.",
      },
    ],
  }),
  component: RevisionPage,
});

const secciones = [
  { id: "contexto", nombre: "Contexto de la empresa", proposito: "Datos generales de tu empresa." },
  ...dimensiones.map((d) => ({ id: d.id, nombre: d.nombre, proposito: d.proposito })),
];

function RevisionPage() {
  const navigate = useNavigate();
  const {
    isHydrated,
    respuestas,
    progreso,
    completo,
    pendientes,
    siguientePendiente,
    estadoGuardado,
    reintentarGuardado,
    marcarRevision,
  } = useDiagnostico();

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const encabezado = (
    <PageHeader
      titulo="Revisión final"
      subtitulo="Verifica lo que respondiste. Puedes corregir cualquier pregunta antes de continuar."
      migas={[
        { label: "Inicio", to: "/inicio" },
        { label: "Diagnóstico", to: "/diagnostico" },
        { label: "Revisión" },
      ]}
    />
  );

  if (respuestas.length === 0) {
    return (
      <div className="space-y-6">
        {encabezado}
        <EmptyState
          title="Todavía no hay respuestas"
          description="Responde al menos una pregunta del diagnóstico para poder revisarla."
          icon={ClipboardList}
          actionLabel="Ir al diagnóstico"
          onAction={() => navigate({ to: "/diagnostico" })}
        />
      </div>
    );
  }

  const handleFinalizar = () => {
    if (!completo) return;
    marcarRevision();
    navigate({ to: "/diagnostico/procesando" });
  };

  return (
    <div className="space-y-6">
      {encabezado}

      <ProgresoDiagnostico
        respondidas={progreso.respondidas}
        total={progreso.total}
        porcentaje={progreso.porcentaje}
      />

      <IndicadorGuardado estado={estadoGuardado} onReintentar={reintentarGuardado} />

      {!completo && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning-foreground"
        >
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            Faltan respuestas obligatorias por completar
          </p>
          <ul className="space-y-1">
            {pendientes.map((grupo) => (
              <li key={grupo.seccionId}>
                {grupo.seccionNombre}: {grupo.preguntas.length}{" "}
                {grupo.preguntas.length === 1 ? "pregunta" : "preguntas"} pendientes
              </li>
            ))}
          </ul>
          {siguientePendiente && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/diagnostico/paso/$id" params={{ id: siguientePendiente.id }}>
                Ir a la primera pregunta pendiente
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {secciones.map((seccion) => {
          const preguntas = preguntasEnOrden.filter((p) =>
            seccion.id === "contexto" ? p.seccion === "contexto" : p.dimensionId === seccion.id
          );
          return (
            <Card key={seccion.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{seccion.nombre}</CardTitle>
                <CardDescription>{seccion.proposito}</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                {preguntas.map((pregunta) => {
                  const respuesta = respuestas.find((r) => r.questionId === pregunta.id);
                  const etiqueta = etiquetaRespuesta(
                    obtenerPregunta(pregunta.id)!,
                    respuesta?.value
                  );
                  return (
                    <div
                      key={pregunta.id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{pregunta.texto}</p>
                        <p className="mt-1 text-sm">
                          {etiqueta ? (
                            <span className="text-muted-foreground">{etiqueta}</span>
                          ) : (
                            <span className="font-medium text-warning-foreground">
                              Sin responder
                            </span>
                          )}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/diagnostico/paso/$id" params={{ id: pregunta.id }}>
                          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                          Editar
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" asChild>
          <Link to="/diagnostico">Volver al diagnóstico</Link>
        </Button>
        <Button size="lg" onClick={handleFinalizar} disabled={!completo}>
          Confirmar y calcular resultado
        </Button>
      </div>
    </div>
  );
}
