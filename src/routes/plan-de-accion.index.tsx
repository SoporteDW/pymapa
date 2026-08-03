import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { useSesion } from "@/hooks/use-sesion";
import { etiquetaEstadoAccion, etiquetaHorizonte } from "@/lib/recorrido";
import { Clock, Target } from "lucide-react";
import { useState } from "react";
import type { Horizonte } from "@/types";

export const Route = createFileRoute("/plan-de-accion/")({
  head: () => ({
    meta: [
      { title: "Plan de acción — Pyme Digital" },
      {
        name: "description",
        content: "Convierte tus prioridades en acciones organizadas por horizonte de tiempo.",
      },
      { property: "og:title", content: "Plan de acción — Pyme Digital" },
      {
        property: "og:description",
        content: "Convierte tus prioridades en acciones organizadas por horizonte de tiempo.",
      },
    ],
  }),
  component: PlanDeAccionPage,
});

const horizontes: Horizonte[] = ["ahora", "despues", "mas_adelante"];

function PlanDeAccionPage() {
  const navigate = useNavigate();
  const { sesion, isHydrated, cargarDatosDemostrativos } = useSesion();
  const [prioridad, setPrioridad] = useState("todas");
  const [estado, setEstado] = useState("todos");
  const [horizonte, setHorizonte] = useState("todos");

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  if (sesion.acciones.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Plan de acción"
          subtitulo="Aquí verás tus acciones cuando tengas resultados."
          migas={[{ label: "Inicio", to: "/inicio" }, { label: "Plan de acción" }]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Primero necesitamos tu diagnóstico</CardTitle>
            <CardDescription>
              El plan de acción se construye a partir de las prioridades que surgen del diagnóstico.
              También puedes cargar datos demostrativos para conocer el recorrido.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => navigate({ to: "/diagnostico" })}>Iniciar diagnóstico</Button>
            <Button variant="outline" onClick={cargarDatosDemostrativos}>
              Cargar datos demostrativos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtradas = sesion.acciones
    .filter((a) => (prioridad === "todas" ? true : a.prioridad === prioridad))
    .filter((a) => (estado === "todos" ? true : a.estado === estado))
    .filter((a) => (horizonte === "todos" ? true : a.horizonte === horizonte));

  const completadas = sesion.acciones.filter((a) => a.estado === "completada").length;
  const enProgreso = sesion.acciones.filter((a) => a.estado === "en_progreso").length;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Plan de acción"
        subtitulo="Acciones concretas, organizadas por lo que conviene hacer primero."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Plan de acción" }]}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/resultados">Volver a Resultados</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumen</CardTitle>
          <CardDescription>
            {sesion.prioridades.length} prioridades identificadas · {sesion.acciones.length}{" "}
            acciones propuestas · {enProgreso} en progreso · {completadas} completadas.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="filtro-prioridad">Prioridad</Label>
          <Select value={prioridad} onValueChange={setPrioridad}>
            <SelectTrigger id="filtro-prioridad">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filtro-estado">Estado</Label>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger id="filtro-estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendiente">No iniciada</SelectItem>
              <SelectItem value="en_progreso">En progreso</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filtro-horizonte">Horizonte</Label>
          <Select value={horizonte} onValueChange={setHorizonte}>
            <SelectTrigger id="filtro-horizonte">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ahora">Ahora</SelectItem>
              <SelectItem value="despues">Después</SelectItem>
              <SelectItem value="mas_adelante">Más adelante</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {filtradas.length === sesion.acciones.length
          ? `Mostrando las ${filtradas.length} acciones.`
          : `Mostrando ${filtradas.length} de ${sesion.acciones.length} acciones.`}
      </p>

      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          Ninguna acción coincide con estos filtros. Ajusta la prioridad, el estado o el horizonte
          para ver más resultados.
        </div>
      ) : (
        horizontes.map((h) => {
          const grupo = filtradas.filter((a) => a.horizonte === h);
          if (grupo.length === 0) return null;
          return (
            <section key={h} aria-labelledby={`grupo-${h}`} className="space-y-3">
              <h2 id={`grupo-${h}`} className="text-lg font-semibold text-foreground">
                {etiquetaHorizonte[h]}
              </h2>
              <div className="grid gap-3">
                {grupo.map((accion) => (
                  <Card key={accion.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <CardTitle className="text-base">{accion.titulo}</CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              accion.prioridad === "alta"
                                ? "default"
                                : accion.prioridad === "media"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            Prioridad {accion.prioridad}
                          </Badge>
                          <Badge variant="outline">{etiquetaEstadoAccion[accion.estado]}</Badge>
                        </div>
                      </div>
                      <CardDescription>{accion.proposito}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" aria-hidden="true" />
                          Impacto {accion.impacto} · esfuerzo {accion.esfuerzo}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" aria-hidden="true" />
                          {accion.duracionEstimada}
                        </span>
                      </div>
                      <Button asChild>
                        <Link to="/plan-de-accion/$accion" params={{ accion: accion.id }}>
                          Ver acción
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })
      )}

      <DemoNote variant="aviso">
        Las acciones y sus duraciones son ilustrativas. La Ficha de Acción definitiva y la
        priorización real se incorporarán en paquetes posteriores del MVP.
      </DemoNote>
    </div>
  );
}
