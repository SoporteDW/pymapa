import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StateBadge } from "./state-badge";
import { clasesNivelPrioridad } from "@/components/resultados/priority-card";
import { calcularAvance, estaProximaAVencer, estaVencida } from "@/lib/roadmap/avance";
import { dependenciasPendientes } from "@/lib/roadmap/estados";
import { formatearFecha } from "@/lib/roadmap/fechas";
import { etiquetaEsfuerzo } from "@/lib/resultados/fichas";
import type { AccionRoadmap, Roadmap } from "@/lib/roadmap/tipos";
import { AlertTriangle, ArrowRight, CalendarDays, Link2, UserRound } from "lucide-react";

/**
 * Tarjeta de acción del Roadmap (POC-06, 9): estado, avance, responsable,
 * fechas y señales operativas visibles sin abrir el detalle.
 */
export function RoadmapActionCard({
  accion,
  roadmap,
  onAbrir,
}: {
  accion: AccionRoadmap;
  roadmap: Roadmap;
  onAbrir?: (accionId: string) => void;
}) {
  const avance = calcularAvance(accion);
  const vencida = estaVencida(accion);
  const proxima = estaProximaAVencer(accion);
  const pendientes = dependenciasPendientes(roadmap, accion);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="gap-2 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <StateBadge estado={accion.estado} />
          <Badge variant="outline" className={clasesNivelPrioridad[accion.prioridadOperativa]}>
            Prioridad {accion.prioridadOperativa}
          </Badge>
          {vencida && (
            <Badge variant="outline" className="border-destructive/50 text-destructive">
              <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" />
              Vencida
            </Badge>
          )}
          {!vencida && proxima && (
            <Badge variant="outline" className="border-amber-500/50 text-amber-700">
              Próxima a vencer
            </Badge>
          )}
        </div>
        <CardTitle className="text-base leading-snug">{accion.titulo}</CardTitle>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Avance</span>
            <span>{avance}%</span>
          </div>
          <Progress value={avance} aria-label={`Avance ${avance} por ciento`} />
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            {accion.responsable || "Sin responsable"}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {accion.fechaObjetivo ? formatearFecha(accion.fechaObjetivo) : "Sin fecha"}
          </span>
          <span>Esfuerzo {etiquetaEsfuerzo(accion.esfuerzo).toLowerCase()}</span>
        </div>

        {pendientes.length > 0 && (
          <p className="inline-flex items-start gap-1 text-xs text-muted-foreground">
            <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Depende de: {pendientes.map((d) => d.titulo).join(", ")}
          </p>
        )}

        <Button variant="outline" size="sm" asChild onClick={() => onAbrir?.(accion.id)}>
          <Link to="/roadmap/$accion" params={{ accion: accion.id }}>
            Abrir seguimiento
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
