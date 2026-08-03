import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoadmapActionCard } from "./roadmap-action-card";
import { accionesDeFase } from "@/lib/roadmap/filtros";
import { fasesRoadmap } from "@/lib/roadmap/fases";
import type { AccionRoadmap, Roadmap } from "@/lib/roadmap/tipos";

/** Vista Tablero por fases (POC-06, 9): Ahora, Próximamente y Más adelante. */
export function RoadmapBoard({
  roadmap,
  visibles,
}: {
  roadmap: Roadmap;
  visibles: AccionRoadmap[];
}) {
  const idsVisibles = new Set(visibles.map((a) => a.id));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {fasesRoadmap.map((fase) => {
        const acciones = accionesDeFase(roadmap, fase.id).filter((a) => idsVisibles.has(a.id));
        return (
          <section key={fase.id} className="space-y-3" aria-label={`Fase ${fase.nombre}`}>
            <Card className="bg-muted/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{fase.nombre}</CardTitle>
                  <Badge variant="secondary">{acciones.length}</Badge>
                </div>
                <CardDescription>{fase.rangoTemporal}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground">
                {fase.descripcion}
              </CardContent>
            </Card>

            {acciones.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No hay acciones en esta fase con los filtros actuales.
              </p>
            ) : (
              <div className="space-y-3">
                {acciones.map((accion) => (
                  <RoadmapActionCard key={accion.id} accion={accion} roadmap={roadmap} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
