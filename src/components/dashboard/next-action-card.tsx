import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "@tanstack/react-router";
import { StateBadge } from "@/components/roadmap/state-badge";
import { formatearFecha } from "@/lib/roadmap/fechas";
import { calcularAvance } from "@/lib/roadmap/avance";
import { registrarEvento } from "@/lib/analytics";
import { ArrowRight, Compass } from "lucide-react";
import type { AccionRoadmap } from "@/lib/roadmap/tipos";

/**
 * KPI-10: próxima acción recomendada con justificación explícita
 * (POC-07, 6 y CA-07). Nunca recomienda acciones completadas o descartadas.
 */
export function NextActionCard({
  accion,
  justificacion,
}: {
  accion: AccionRoadmap | null;
  justificacion: string;
}) {
  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Compass className="h-5 w-5 text-primary" aria-hidden="true" />
          Actividad destacada · consulta
        </CardTitle>
        <CardDescription>{justificacion}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!accion ? (
          <p className="text-sm text-muted-foreground">
            No hay actividades para destacar en esta vista de consulta.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{accion.titulo}</p>
              <p className="text-sm text-muted-foreground">{accion.objetivo}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <StateBadge estado={accion.estado} />
              <Badge variant="secondary">{accion.origen.dimensionNombre}</Badge>
              <Badge variant="outline">Prioridad {accion.prioridadOrigenLabel}</Badge>
              <span className="text-muted-foreground">
                {accion.fechaObjetivo
                  ? `Fecha objetivo: ${formatearFecha(accion.fechaObjetivo)}`
                  : "Sin fecha objetivo"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Progress
                value={calcularAvance(accion)}
                aria-label={`Avance de ${accion.titulo}: ${calcularAvance(accion)} por ciento`}
              />
              <span className="text-sm font-semibold tabular-nums">{calcularAvance(accion)}%</span>
            </div>
            <Button
              variant="outline"
              asChild
              onClick={() =>
                registrarEvento("dashboard_next_action_opened", { accionId: accion.id })
              }
            >
              <Link to="/roadmap/$accion" params={{ accion: accion.id }}>
                Consultar esta actividad
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
