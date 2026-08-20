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
import { FilterX } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Tu plan de acción"
        subtitulo="Fichas concretas derivadas de tu diagnóstico, ordenadas por prioridad."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Plan de acción" }]}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/resultados">Volver a resultados</Link>
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
            title="Tu diagnóstico no generó fichas de acción"
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
                <CardTitle className="text-lg">Cómo usar estas fichas</CardTitle>
                <CardDescription>
                  Cada ficha responde a un hallazgo del diagnóstico y explica el problema, el
                  beneficio esperado, los pasos sugeridos y cómo saber si funcionó. Empieza por las
                  primeras: habilitan a las siguientes.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{resultado.actions.length} fichas generadas</Badge>
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
              Las fichas marcadas con un punto de apoyo requieren una intervención adicional
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

