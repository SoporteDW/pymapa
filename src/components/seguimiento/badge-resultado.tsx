import { Badge } from "@/components/ui/badge";
import { etiquetaResultadoSeguimiento } from "@/lib/seguimiento/servicio";
import type { ResultadoSeguimiento } from "@/lib/seguimiento/tipos";
import { HelpCircle, Minus, TrendingDown, TrendingUp } from "lucide-react";

const estilos: Record<ResultadoSeguimiento, string> = {
  mejoro: "border-success/40 text-success",
  sin_cambio: "border-border text-muted-foreground",
  empeoro: "border-destructive/40 text-destructive",
  insuficiente: "border-warning/40 text-warning",
};

const iconos: Record<ResultadoSeguimiento, typeof Minus> = {
  mejoro: TrendingUp,
  sin_cambio: Minus,
  empeoro: TrendingDown,
  insuficiente: HelpCircle,
};

/** B7 · Conclusión cualitativa del seguimiento (sin scoring). */
export function BadgeResultadoSeguimiento({ resultado }: { resultado: ResultadoSeguimiento }) {
  const Icono = iconos[resultado];
  return (
    <Badge variant="outline" className={`w-fit gap-1.5 ${estilos[resultado]}`}>
      <Icono className="h-3.5 w-3.5" aria-hidden="true" />
      {etiquetaResultadoSeguimiento[resultado]}
    </Badge>
  );
}
