import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { formatearFechaHora } from "@/lib/roadmap/fechas";
import { ArrowRight } from "lucide-react";
import type { ActivityEvent } from "@/lib/dashboard/tipos";

const ETIQUETA_EVENTO: Record<ActivityEvent["eventType"], string> = {
  cambio_estado: "Cambio de estado",
  avance: "Avance",
  evidencia: "Evidencia",
  bloqueo: "Bloqueo",
  reprogramacion: "Reprogramación",
  nota: "Nota",
  diagnostico: "Diagnóstico",
  otro: "Registro",
};

/** KPI-09: línea de tiempo de actividad reciente (POC-07, 8.4). */
export function ActivityTimeline({
  eventos,
  limite = 10,
  titulo = "Actividad reciente",
}: {
  eventos: ActivityEvent[];
  limite?: number;
  titulo?: string;
}) {
  const visibles = eventos.slice(0, limite);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{titulo}</CardTitle>
        <CardDescription>
          {eventos.length === 0
            ? "Sin actividad registrada en el periodo seleccionado."
            : `${eventos.length} registro(s) en el periodo. Se muestran los más recientes.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {visibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Actualiza una acción del Roadmap para comenzar a construir el historial.
          </p>
        ) : (
          <ol className="space-y-4">
            {visibles.map((evento) => (
              <li key={evento.id} className="flex gap-3">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{evento.title}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {ETIQUETA_EVENTO[evento.eventType]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{evento.detalle}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatearFechaHora(evento.timestamp)} · {evento.actor}
                  </p>
                  {evento.relatedEntityType === "accion" && (
                    <Button variant="link" className="h-auto px-0 text-xs" asChild>
                      <Link to="/roadmap/$accion" params={{ accion: evento.relatedEntityId }}>
                        Ver acción
                        <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
