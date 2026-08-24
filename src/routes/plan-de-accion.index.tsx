import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { EtapaFooter, EtapaProgreso } from "@/components/recorrido/etapa-nav";

import { ResultState } from "@/components/resultados/result-state";
import { ActionCard } from "@/components/resultados/action-card";
import { PriorityFilters } from "@/components/resultados/priority-filters";
import { useResultados } from "@/hooks/use-resultados";
import { filtrarAcciones, filtrosIniciales, type FiltrosAcciones } from "@/lib/resultados/generador";
import { registrarEvento } from "@/lib/analytics";
import { IniciativasKb } from "@/components/kb/iniciativas-kb";
import { useIniciativasKb } from "@/hooks/use-kb-ecommerce";
import { ArrowRight, FilterX } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { BloqueoEtapa } from "@/components/journey/bloqueo-etapa";
import { useJourney } from "@/hooks/use-journey";

export const Route = createFileRoute("/plan-de-accion/")({
  head: () => ({
    meta: [
      { title: "Plan de acción — pymapa" },
      {
        name: "description",
        content: "Fichas de acción priorizadas para avanzar en tu transformación digital.",
      },
      { property: "og:title", content: "Plan de acción — pymapa" },
      {
        property: "og:description",
        content: "Fichas de acción priorizadas para avanzar en tu transformación digital.",
      },
    ],
  }),
  component: PlanDeAccionPage,
});

function PlanDeAccionPage() {
  const navigate = useNavigate();
  const { hidratado, bloqueoDe, ejecucion } = useJourney();
  const { estado, resultado, errorCodigo, reintentar } = useResultados();
  const { iniciativas } = useIniciativasKb();
  const [filtros, setFiltros] = useState<FiltrosAcciones>(filtrosIniciales);

  const acciones = useMemo(
    () => (resultado ? filtrarAcciones(resultado, filtros) : []),
    [resultado, filtros]
  );

  const cambiarFiltros = (nuevos: FiltrosAcciones) => {
    setFiltros(nuevos);
    registrarEvento("action_filters_changed", {
      nivel: nuevos.nivel,
      esfuerzo: nuevos.esfuerzo,
      orden: nuevos.orden,
    });
  };

  const bloqueo = bloqueoDe("actuar");

  if (!hidratado) return <LoadingState fullPage />;

  if (bloqueo) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Tu Plan de Acción"
          subtitulo="Etapa 3 · Actuar"
          migas={[{ label: "Inicio", to: "/inicio" }, { label: "Plan de Acción" }]}
        />
        <BloqueoEtapa bloqueo={bloqueo} titulo="Tu Plan de Acción aún no está disponible" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Tu Plan de Acción"
        subtitulo="Actividades derivadas de tu diagnóstico, ordenadas por prioridad."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Plan de Acción" }]}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/roadmap">Ver el Roadmap</Link>
          </Button>
        }
      />

      <EtapaProgreso modulo="plan-de-accion" />



      <ResultState
        estado={estado}
        errorCodigo={errorCodigo}
        onReintentar={reintentar}
        onIrAlDiagnostico={() => navigate({ to: "/diagnostico" })}
      >
        {/* POC-09 (D-02): una pyme sin brechas accionables no genera fichas; se explica el motivo. */}
        {resultado && resultado.actions.length === 0 && (
          <EmptyState
            title="Tu diagnóstico no generó Actividades"
            description="No se detectaron brechas ni riesgos que requieran una acción inmediata. Revisa tus resultados para ver las fortalezas identificadas."
            icon={FilterX}
            actionLabel="Ver mis resultados"
            onAction={() => navigate({ to: "/resultados" })}
          />
        )}

        {resultado && resultado.actions.length > 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cómo trabajar tus Actividades</CardTitle>
                <CardDescription>
                  Cada Actividad responde a un hallazgo del diagnóstico: su Ficha explica qué
                  encontramos, qué queremos lograr, cómo trabajarla, qué debes entregar y cómo se
                  valida. Empieza por las primeras: habilitan a las siguientes. El Roadmap muestra
                  estas mismas Actividades en el tiempo.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{resultado.actions.length} Actividades priorizadas</Badge>
                <Badge variant="outline">
                  {resultado.actions.filter((a) => a.priorityLevel === "critica").length} críticas
                </Badge>
                <Badge variant="outline">
                  {resultado.actions.filter((a) => a.effort === "bajo").length} de bajo esfuerzo
                </Badge>
                {resultado.actions.some((a) => a.requiereValidacion) && (
                  <Badge variant="outline">Algunas requieren validación previa</Badge>
                )}
              </CardContent>
            </Card>

            <PriorityFilters
              filtros={filtros}
              dimensiones={resultado.dimensions}
              onCambio={cambiarFiltros}
            />

            {acciones.length === 0 ? (
              <EmptyState
                title="Ninguna ficha coincide con los filtros"
                description="Ajusta los filtros para ver otras fichas de acción disponibles."
                icon={FilterX}
                actionLabel="Restablecer filtros"
                onAction={() => cambiarFiltros(filtrosIniciales)}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {acciones.map((ficha) => (
                  <ActionCard key={ficha.id} ficha={ficha} />
                ))}
              </div>
            )}


            <DemoNote>
              Las Actividades marcadas con un punto de apoyo requieren una intervención adicional
              (consultor, decisión gerencial, documento o validación). No bloquean tu avance.
            </DemoNote>
          </div>
        )}
      </ResultState>

      <IniciativasKb iniciativas={iniciativas} />

      <EtapaFooter modulo="plan-de-accion" />
    </div>
  );
}

