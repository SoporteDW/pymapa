import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "@tanstack/react-router";
import { registrarEvento } from "@/lib/analytics";
import { ArrowRight } from "lucide-react";
import type { ItemDimensionDashboard } from "@/lib/dashboard/tipos";

/**
 * KPI-06: barras horizontales comparables por dimensión con alternativa
 * textual (valor numérico y nivel cualitativo junto a cada barra).
 */
export function DimensionProgressList({
  dimensiones,
}: {
  dimensiones: ItemDimensionDashboard[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Progreso por dimensión</CardTitle>
        <CardDescription>
          Madurez del diagnóstico vigente y avance de las acciones asociadas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dimensiones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin información disponible</p>
        ) : (
          <ul className="space-y-4">
            {dimensiones.map((dimension) => (
              <li key={dimension.dimensionId} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{dimension.nombre}</span>
                    <Badge variant="secondary">{dimension.nivelLabel}</Badge>
                    {dimension.parcial && <Badge variant="outline">Lectura parcial</Badge>}
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {dimension.madurez}/100
                  </span>
                </div>
                <Progress
                  value={dimension.madurez}
                  aria-label={`Madurez de ${dimension.nombre}: ${dimension.madurez} de 100`}
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {dimension.avanceAcciones === null
                      ? "Sin acciones asociadas"
                      : `Avance de acciones: ${dimension.avanceAcciones}%`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {dimension.completadas} de {dimension.totalAcciones} completadas
                  </span>
                  {dimension.bloqueadas > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{dimension.bloqueadas} bloqueada(s)</span>
                    </>
                  )}
                  {dimension.vencidas > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{dimension.vencidas} vencida(s)</span>
                    </>
                  )}
                </div>
                <Button
                  variant="link"
                  className="h-auto px-0"
                  asChild
                  onClick={() =>
                    registrarEvento("dashboard_dimension_opened", {
                      dimensionId: dimension.dimensionId,
                    })
                  }
                >
                  <Link
                    to="/dashboard/dimension/$dimension"
                    params={{ dimension: dimension.dimensionId }}
                  >
                    Ver detalle de la dimensión
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
