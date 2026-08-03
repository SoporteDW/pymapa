import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSesion } from "@/hooks/use-sesion";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRight, ListTodo, Play, Target } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/plan-de-accion")({
  head: () => ({
    meta: [
      { title: "Plan de acción — Pyme Digital" },
      { name: "description", content: "Prioridades y acciones recomendadas para tu transformación digital." },
      { property: "og:title", content: "Plan de acción — Pyme Digital" },
      { property: "og:description", content: "Prioridades y acciones recomendadas para tu transformación digital." },
    ],
  }),
  component: PlanDeAccionPage,
});

const prioridadOrden = { alta: 0, media: 1, baja: 2 };
const estadoOptions = ["todas", "pendiente", "en_progreso", "completada", "pausada"] as const;
const prioridadOptions = ["todas", "alta", "media", "baja"] as const;

function PlanDeAccionPage() {
  const { sesion, isHydrated, updateAccion } = useSesion();
  const [estadoFiltro, setEstadoFiltro] = useState<(typeof estadoOptions)[number]>("todas");
  const [prioridadFiltro, setPrioridadFiltro] = useState<(typeof prioridadOptions)[number]>("todas");

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  if (sesion.acciones.length === 0) {
    return (
      <EmptyState
        title="Aún no tienes acciones"
        description="Completa el diagnóstico para generar acciones recomendadas."
        icon={ListTodo}
        actionLabel="Comenzar diagnóstico"
        onAction={() => {
          window.location.href = "/diagnostico";
        }}
      />
    );
  }

  const accionesFiltradas = sesion.acciones
    .filter((a) => (estadoFiltro === "todas" ? true : a.estado === estadoFiltro))
    .filter((a) => (prioridadFiltro === "todas" ? true : a.prioridad === prioridadFiltro))
    .sort((a, b) => prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]);

  const handleStartAction = (id: string) => {
    const accion = sesion.acciones.find((a) => a.id === id);
    if (accion) {
      updateAccion({ ...accion, estado: "en_progreso" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plan de acción</h1>
          <p className="text-sm text-muted-foreground">Acciones priorizadas para mejorar la madurez digital.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/resultados">Volver a resultados</Link>
        </Button>
      </div>

      <Tabs defaultValue="estado" className="w-full">
        <TabsList>
          <TabsTrigger value="estado">Filtrar por estado</TabsTrigger>
          <TabsTrigger value="prioridad">Filtrar por prioridad</TabsTrigger>
        </TabsList>
        <TabsContent value="estado" className="mt-4">
          <div className="flex flex-wrap gap-2">
            {estadoOptions.map((e) => (
              <Button
                key={e}
                variant={estadoFiltro === e ? "default" : "outline"}
                size="sm"
                onClick={() => setEstadoFiltro(e)}
              >
                {e === "todas" ? "Todas" : e.replace("_", " ")}
              </Button>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="prioridad" className="mt-4">
          <div className="flex flex-wrap gap-2">
            {prioridadOptions.map((p) => (
              <Button
                key={p}
                variant={prioridadFiltro === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPrioridadFiltro(p)}
              >
                {p === "todas" ? "Todas" : p}
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4">
        {accionesFiltradas.map((accion) => (
          <Card key={accion.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{accion.titulo}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant={accion.prioridad === "alta" ? "destructive" : accion.prioridad === "media" ? "secondary" : "outline"}>
                    {accion.prioridad}
                  </Badge>
                  <Badge variant="outline">{accion.estado.replace("_", " ")}</Badge>
                </div>
              </div>
              <CardDescription>{accion.proposito}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4" aria-hidden="true" />
                  Impacto: {accion.impacto}
                </span>
                <span className="flex items-center gap-1">
                  <ListTodo className="h-4 w-4" aria-hidden="true" />
                  Esfuerzo: {accion.esfuerzo}
                </span>
              </div>
              <div className="mt-4 flex justify-end">
                {accion.estado === "pendiente" && (
                  <Button size="sm" onClick={() => handleStartAction(accion.id)}>
                    <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                    Comenzar acción
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {accionesFiltradas.length === 0 && (
        <EmptyState
          title="No hay acciones con estos filtros"
          description="Prueba con otros filtros para ver más acciones."
          icon={ListTodo}
        />
      )}

      <div className="rounded-lg border border-warning/20 bg-warning/5 p-4 text-sm text-warning-foreground">
        <p>
          <strong>Datos simulados:</strong> Las acciones mostradas son ilustrativas. Las Fichas de Acción completas y su priorización real se definirán en un siguiente paquete.
        </p>
      </div>
    </div>
  );
}
