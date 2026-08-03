import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StateBadge } from "./state-badge";
import { clasesNivelPrioridad } from "@/components/resultados/priority-card";
import { calcularAvance, estaVencida } from "@/lib/roadmap/avance";
import { etiquetaFase } from "@/lib/roadmap/fases";
import { formatearFecha } from "@/lib/roadmap/fechas";
import type { AccionRoadmap, Roadmap } from "@/lib/roadmap/tipos";

/** Vista Lista (POC-06, 10): tabla operativa ordenable y filtrable. */
export function RoadmapList({
  acciones,
  roadmap,
}: {
  acciones: AccionRoadmap[];
  roadmap: Roadmap;
}) {
  if (acciones.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Ninguna acción coincide con los filtros seleccionados.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Acción</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead>Fecha objetivo</TableHead>
            <TableHead className="w-[140px]">Avance</TableHead>
            <TableHead className="text-right">Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {acciones.map((accion) => {
            const avance = calcularAvance(accion);
            return (
              <TableRow key={accion.id}>
                <TableCell className="max-w-[280px]">
                  <p className="font-medium leading-snug">{accion.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {accion.origen.dimensionNombre}
                  </p>
                </TableCell>
                <TableCell className="text-sm">{etiquetaFase[accion.faseId]}</TableCell>
                <TableCell>
                  <StateBadge estado={accion.estado} />
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={clasesNivelPrioridad[accion.prioridadOperativa]}
                  >
                    {accion.prioridadOperativa}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {accion.responsable || (
                    <span className="text-muted-foreground">Sin responsable</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {accion.fechaObjetivo ? (
                    <span className={estaVencida(accion) ? "text-destructive" : undefined}>
                      {formatearFecha(accion.fechaObjetivo)}
                      {estaVencida(accion) && " (vencida)"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Sin fecha</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Progress value={avance} aria-label={`Avance ${avance} por ciento`} />
                    <span className="text-xs text-muted-foreground">{avance}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/roadmap/$accion" params={{ accion: accion.id }}>
                      Abrir
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="border-t p-3 text-xs text-muted-foreground">
        {acciones.length} de {roadmap.acciones.length} acciones del plan.
      </p>
    </div>
  );
}
