import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { clasesEstado } from "@/components/roadmap/state-badge";
import { formatearFechaHora } from "@/lib/roadmap/fechas";
import { etiquetaSeveridad, etiquetaTipoAlerta } from "@/lib/dashboard/alertas";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Info, TriangleAlert } from "lucide-react";
import type { AlertaDashboard } from "@/lib/dashboard/tipos";

const ICONO = {
  critica: AlertTriangle,
  advertencia: TriangleAlert,
  informativa: Info,
} as const;

const BORDE = {
  critica: "border-l-4 border-l-destructive",
  advertencia: "border-l-4 border-l-amber-500",
  informativa: "border-l-4 border-l-muted-foreground/40",
} as const;

/**
 * Tarjeta de alerta con causa, consecuencia, fecha y acción recomendada
 * (POC-07, 8.3). La severidad se comunica con texto e icono, no sólo color.
 */
export function AlertCard({ alerta }: { alerta: AlertaDashboard }) {
  const Icono = ICONO[alerta.severity];
  return (
    <Card className={cn(BORDE[alerta.severity])}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">{alerta.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Icono className="h-3.5 w-3.5" aria-hidden="true" />
              {etiquetaSeveridad[alerta.severity]}
            </Badge>
            <Badge variant="secondary">{etiquetaTipoAlerta[alerta.type]}</Badge>
          </div>
        </div>
        <CardDescription>
          {alerta.createdAt
            ? `Último registro: ${formatearFechaHora(alerta.createdAt)}`
            : "Sin registros de seguimiento asociados"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="font-medium text-foreground">Causa: </span>
          <span className="text-muted-foreground">{alerta.causa}</span>
        </p>
        <p>
          <span className="font-medium text-foreground">Consecuencia: </span>
          <span className="text-muted-foreground">{alerta.consecuencia}</span>
        </p>
        <p>
          <span className="font-medium text-foreground">Qué hacer: </span>
          <span className="text-muted-foreground">{alerta.recomendacion}</span>
        </p>
        {alerta.relatedActionId && (
          <Button variant="link" className="h-auto px-0" asChild>
            <Link to="/roadmap/$accion" params={{ accion: alerta.relatedActionId }}>
              Abrir acción
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Resumen compacto de alertas para el dashboard general. */
export function AlertSummaryCard({
  alertas,
  className,
}: {
  alertas: AlertaDashboard[];
  className?: string;
}) {
  const criticas = alertas.filter((a) => a.severity === "critica");
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Alertas que requieren atención</CardTitle>
        <CardDescription>
          {alertas.length === 0
            ? "No hay alertas abiertas con los filtros actuales."
            : `${criticas.length} crítica(s) de ${alertas.length} alerta(s) abiertas.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alertas.slice(0, 3).map((alerta) => {
          const Icono = ICONO[alerta.severity];
          return (
            <div key={alerta.id} className="flex items-start gap-2 text-sm">
              <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-foreground">{alerta.title}</p>
                <p className="text-muted-foreground">{alerta.recomendacion}</p>
              </div>
            </div>
          );
        })}
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/alertas">
            Ir al centro de alertas
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export { clasesEstado };
