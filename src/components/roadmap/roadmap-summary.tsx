import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatearFecha } from "@/lib/roadmap/fechas";
import type { AlertaOperativa } from "@/lib/roadmap/alertas";
import type { AccionRoadmap, ResumenRoadmap, Roadmap } from "@/lib/roadmap/tipos";
import { AlertTriangle, ArrowRight, Info, TriangleAlert } from "lucide-react";

const iconoSeveridad = {
  critica: AlertTriangle,
  advertencia: TriangleAlert,
  informativa: Info,
} as const;

/** Resumen operativo del plan (POC-06, 8): progreso, estados y próxima acción. */
export function RoadmapSummary({
  roadmap,
  resumen,
  alertas,
  siguiente,
}: {
  roadmap: Roadmap;
  resumen: ResumenRoadmap;
  alertas: AlertaOperativa[];
  siguiente: AccionRoadmap | null;
}) {
  const criticas = alertas.filter((a) => a.severidad === "critica").slice(0, 3);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Avance general del plan</CardTitle>
          <CardDescription>
            {resumen.completadas} de {resumen.totalAcciones - resumen.descartadas} acciones activas
            completadas · actualizado el {formatearFecha(roadmap.fechaActualizacion.slice(0, 10))}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progreso ponderado</span>
              <span className="font-semibold">{resumen.progresoGeneral}%</span>
            </div>
            <Progress
              value={resumen.progresoGeneral}
              aria-label={`Progreso general ${resumen.progresoGeneral} por ciento`}
            />
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              { etiqueta: "En curso", valor: resumen.enCurso },
              { etiqueta: "Listas", valor: resumen.listas },
              { etiqueta: "Bloqueadas", valor: resumen.bloqueadas },
              { etiqueta: "Vencidas", valor: resumen.vencidas },
              { etiqueta: "Pendientes", valor: resumen.pendientes },
              { etiqueta: "Pausadas", valor: resumen.pausadas },
              { etiqueta: "Sin responsable", valor: resumen.sinResponsable },
              { etiqueta: "Completadas", valor: resumen.completadas },
            ].map((dato) => (
              <div key={dato.etiqueta} className="rounded-md border bg-card p-3">
                <dt className="text-xs text-muted-foreground">{dato.etiqueta}</dt>
                <dd className="text-xl font-semibold">{dato.valor}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Siguiente acción sugerida</CardTitle>
            <CardDescription>
              Priorizada por impacto y sin impedimentos registrados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {siguiente ? (
              <>
                <p className="text-sm font-medium">{siguiente.titulo}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{siguiente.origen.dimensionNombre}</Badge>
                  <Badge variant="outline">
                    {siguiente.responsable || "Asignar responsable"}
                  </Badge>
                </div>
                <Button size="sm" asChild>
                  <Link to="/roadmap/$accion" params={{ accion: siguiente.id }}>
                    Continuar
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay acciones disponibles para iniciar. Resuelve los bloqueos o revisa las
                dependencias pendientes.
              </p>
            )}
          </CardContent>
        </Card>

        {criticas.length > 0 && (
          <div className="space-y-2">
            {criticas.map((alerta) => {
              const Icono = iconoSeveridad[alerta.severidad];
              return (
                <Alert key={`${alerta.tipo}-${alerta.accionId}`} variant="destructive">
                  <Icono className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>
                    {alerta.titulo}: {alerta.accionTitulo}
                  </AlertTitle>
                  <AlertDescription>{alerta.detalle}</AlertDescription>
                </Alert>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
