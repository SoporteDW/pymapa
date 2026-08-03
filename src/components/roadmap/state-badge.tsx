import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { etiquetaEstado } from "@/lib/roadmap/estados";
import type { EstadoAccionRoadmap } from "@/lib/roadmap/tipos";

/** Colores semánticos por estado; el texto siempre acompaña al color (POC-06, 18). */
export const clasesEstado: Record<EstadoAccionRoadmap, string> = {
  PENDIENTE: "border-muted-foreground/30 text-muted-foreground",
  LISTA: "border-primary/40 text-primary",
  EN_CURSO: "border-primary bg-primary/10 text-primary",
  PAUSADA: "border-amber-500/50 text-amber-700 dark:text-amber-400",
  BLOQUEADA: "border-destructive/50 text-destructive",
  COMPLETADA: "border-emerald-600/50 text-emerald-700 dark:text-emerald-400",
  DESCARTADA: "border-muted-foreground/20 text-muted-foreground line-through",
};

export function StateBadge({
  estado,
  className,
}: {
  estado: EstadoAccionRoadmap;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(clasesEstado[estado], className)}>
      {etiquetaEstado[estado]}
    </Badge>
  );
}
