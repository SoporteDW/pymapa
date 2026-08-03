import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DemoNote } from "@/components/ui/demo-note";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { RoadmapSummary } from "@/components/roadmap/roadmap-summary";
import { RoadmapFilters } from "@/components/roadmap/roadmap-filters";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { RoadmapList } from "@/components/roadmap/roadmap-list";
import { RoadmapTimeline } from "@/components/roadmap/roadmap-timeline";
import { useRoadmap } from "@/hooks/use-roadmap";
import { registrarEvento } from "@/lib/analytics";
import { ListTodo, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/roadmap/")({
  head: () => ({
    meta: [
      { title: "Roadmap y seguimiento — Pyme Digital" },
      {
        name: "description",
        content:
          "Organiza tus acciones por fases, registra avances y detecta bloqueos en la ejecución.",
      },
      { property: "og:title", content: "Roadmap y seguimiento — Pyme Digital" },
      {
        property: "og:description",
        content: "Organiza tus acciones por fases, registra avances y detecta bloqueos.",
      },
    ],
  }),
  component: RoadmapPage,
});

function RoadmapPage() {
  const navigate = useNavigate();
  const {
    estado,
    sinAccionesPorMadurez,
    roadmap,
    resumen,
    alertas,
    cronograma,
    siguiente,
    filtros,
    setFiltros,
    accionesFiltradas,
    mensaje,
    cargarDemo,
    reiniciar,
    modoDemo,
  } = useRoadmap();
  const [vista, setVista] = useState("tablero");

  useEffect(() => {
    registrarEvento("roadmap_viewed", {});
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Roadmap y seguimiento"
        subtitulo="Tu plan por fases, con avance, responsables y alertas de ejecución."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Roadmap" }]}
        acciones={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/plan-de-accion">Ver fichas</Link>
            </Button>
            {roadmap && (
              <Button variant="outline" onClick={reiniciar}>
                <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />
                Regenerar plan
              </Button>
            )}
          </div>
        }
      />

      {mensaje && (
        <Alert variant={mensaje.tono === "aviso" ? "destructive" : "default"}>
          <AlertDescription>{mensaje.texto}</AlertDescription>
        </Alert>
      )}

      {estado === "cargando" && <LoadingState message="Preparando tu roadmap…" />}

      {estado === "error" && (
        <EmptyState
          title="No pudimos preparar el roadmap"
          description="Vuelve a intentarlo o revisa tu diagnóstico."
          icon={ListTodo}
          actionLabel="Ir al diagnóstico"
          onAction={() => navigate({ to: "/diagnostico" })}
        />
      )}

      {estado === "vacio" && (
        <EmptyState
          title={
            sinAccionesPorMadurez
              ? "Tu diagnóstico no dejó acciones pendientes"
              : "Todavía no hay acciones para planificar"
          }
          description={
            sinAccionesPorMadurez
              ? "No se detectaron brechas ni riesgos accionables: por eso el plan está vacío. Revisa tus resultados para confirmar tus fortalezas o vuelve a responder el diagnóstico si tu situación cambió."
              : "Completa el diagnóstico para generar tus fichas de acción y su roadmap, o carga un plan de demostración."
          }
          icon={ListTodo}
          actionLabel={sinAccionesPorMadurez ? "Ver mis resultados" : "Cargar plan de demostración"}
          onAction={
            sinAccionesPorMadurez ? () => navigate({ to: "/resultados" }) : cargarDemo
          }
        />
      )}

      {estado === "listo" && roadmap && resumen && cronograma && (
        <div className="space-y-6">
          <RoadmapSummary
            roadmap={roadmap}
            resumen={resumen}
            alertas={alertas}
            siguiente={siguiente}
          />

          <RoadmapFilters roadmap={roadmap} filtros={filtros} onCambio={setFiltros} />

          <Tabs
            value={vista}
            onValueChange={(valor) => {
              setVista(valor);
              registrarEvento("roadmap_view_changed", { vista: valor });
            }}
          >
            <TabsList>
              <TabsTrigger value="tablero">Tablero</TabsTrigger>
              <TabsTrigger value="lista">Lista</TabsTrigger>
              <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
            </TabsList>
            <TabsContent value="tablero" className="mt-4">
              <RoadmapBoard roadmap={roadmap} visibles={accionesFiltradas} />
            </TabsContent>
            <TabsContent value="lista" className="mt-4">
              <RoadmapList acciones={accionesFiltradas} roadmap={roadmap} />
            </TabsContent>
            <TabsContent value="cronograma" className="mt-4">
              <RoadmapTimeline cronograma={cronograma} />
            </TabsContent>
          </Tabs>

          <DemoNote>
            {modoDemo
              ? "Estás viendo un plan de demostración con datos simulados."
              : "MVP Alfa: el seguimiento se guarda solo en este navegador."}
          </DemoNote>
        </div>
      )}
    </div>
  );
}
