import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { etiquetaPeriodo } from "@/lib/dashboard/filtros";
import { etiquetaEstado } from "@/lib/roadmap/estados";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { DashboardFilters, PeriodoDashboard } from "@/lib/dashboard/tipos";
import type { EstadoAccionRoadmap } from "@/lib/roadmap/tipos";
import type { NivelPrioridad } from "@/lib/resultados/tipos";
import type { DimensionResultVista } from "@/lib/resultados/tipos";

const PERIODOS: PeriodoDashboard[] = ["30", "90", "180", "historico"];
const ESTADOS: EstadoAccionRoadmap[] = [
  "PENDIENTE",
  "LISTA",
  "EN_CURSO",
  "PAUSADA",
  "BLOQUEADA",
  "COMPLETADA",
  "DESCARTADA",
];
const PRIORIDADES: { valor: NivelPrioridad; etiqueta: string }[] = [
  { valor: "critica", etiqueta: "Crítica" },
  { valor: "alta", etiqueta: "Alta" },
  { valor: "media", etiqueta: "Media" },
  { valor: "baja", etiqueta: "Baja" },
];

/**
 * Filtros globales del dashboard (POC-07, 9). Todos los indicadores del
 * snapshot se recalculan con estos valores y la selección se conserva en la
 * sesión mientras se navega entre vistas.
 */
export function DashboardFiltersBar({
  filtros,
  dimensiones,
  responsables,
  activos,
  onCambiar,
  onRestablecer,
}: {
  filtros: DashboardFilters;
  dimensiones: DimensionResultVista[];
  responsables: string[];
  activos: number;
  onCambiar: (cambios: Partial<DashboardFilters>) => void;
  onRestablecer: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filtros del tablero
            {activos > 0 && <Badge variant="secondary">{activos} activo(s)</Badge>}
          </p>
          <Button variant="ghost" size="sm" onClick={onRestablecer} disabled={activos === 0}>
            <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
            Restablecer
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="filtro-periodo">Periodo</Label>
            <Select
              value={filtros.period}
              onValueChange={(valor) => onCambiar({ period: valor as PeriodoDashboard })}
            >
              <SelectTrigger id="filtro-periodo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((periodo) => (
                  <SelectItem key={periodo} value={periodo}>
                    {etiquetaPeriodo[periodo]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filtro-dimension">Dimensión</Label>
            <Select
              value={filtros.dimensionId}
              onValueChange={(valor) => onCambiar({ dimensionId: valor })}
            >
              <SelectTrigger id="filtro-dimension">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las dimensiones</SelectItem>
                {dimensiones.map((dimension) => (
                  <SelectItem key={dimension.dimensionId} value={dimension.dimensionId}>
                    {dimension.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filtro-prioridad">Prioridad</Label>
            <Select
              value={filtros.priority}
              onValueChange={(valor) =>
                onCambiar({ priority: valor as DashboardFilters["priority"] })
              }
            >
              <SelectTrigger id="filtro-prioridad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las prioridades</SelectItem>
                {PRIORIDADES.map((prioridad) => (
                  <SelectItem key={prioridad.valor} value={prioridad.valor}>
                    {prioridad.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filtro-estado">Estado de la acción</Label>
            <Select
              value={filtros.actionStatus}
              onValueChange={(valor) =>
                onCambiar({ actionStatus: valor as DashboardFilters["actionStatus"] })
              }
            >
              <SelectTrigger id="filtro-estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {ESTADOS.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {etiquetaEstado[estado]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filtro-responsable">Responsable</Label>
            <Select
              value={filtros.ownerId}
              onValueChange={(valor) => onCambiar({ ownerId: valor })}
            >
              <SelectTrigger id="filtro-responsable">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los responsables</SelectItem>
                {responsables.map((responsable) => (
                  <SelectItem key={responsable} value={responsable}>
                    {responsable}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
