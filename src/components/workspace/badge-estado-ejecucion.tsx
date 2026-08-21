import { Badge } from "@/components/ui/badge";
import { etiquetaEstadoEjecucion } from "@/lib/workspace/estados";
import type { EstadoEjecucion } from "@/lib/workspace/tipos";
import { CheckCircle2, Clock, Loader2, RotateCcw, Send } from "lucide-react";

const estilos: Record<EstadoEjecucion, string> = {
  pendiente: "border-border text-muted-foreground",
  en_ejecucion: "border-primary/40 text-primary",
  entregado: "border-accent/50 text-accent-foreground",
  requiere_ajustes: "border-warning/40 text-warning",
  validado: "border-success/40 text-success",
};

const iconos: Record<EstadoEjecucion, typeof Clock> = {
  pendiente: Clock,
  en_ejecucion: Loader2,
  entregado: Send,
  requiere_ajustes: RotateCcw,
  validado: CheckCircle2,
};

/** B5 · Estado del ciclo de entrega y validación de una actividad. */
export function BadgeEstadoEjecucion({ estado }: { estado: EstadoEjecucion }) {
  const Icono = iconos[estado];
  return (
    <Badge variant="outline" className={`w-fit gap-1.5 ${estilos[estado]}`}>
      <Icono className="h-3.5 w-3.5" aria-hidden="true" />
      {etiquetaEstadoEjecucion[estado]}
    </Badge>
  );
}
