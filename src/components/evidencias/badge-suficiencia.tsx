import { Badge } from "@/components/ui/badge";
import { etiquetaSuficiencia } from "@/lib/suficiencia/motor";
import type { EstadoSuficiencia } from "@/lib/suficiencia/tipos";
import { CheckCircle2, CircleDashed, FileText, MessageCircleQuestion } from "lucide-react";

const estilos: Record<
  EstadoSuficiencia,
  { clase: string; Icono: typeof CheckCircle2 }
> = {
  suficiente: {
    clase: "border-success/40 bg-success/10 text-success",
    Icono: CheckCircle2,
  },
  insuficiente: {
    clase: "border-muted-foreground/30 bg-muted text-muted-foreground",
    Icono: CircleDashed,
  },
  evidencia_pendiente: {
    clase: "border-info/40 bg-info/10 text-info",
    Icono: FileText,
  },
  aclaracion_pendiente: {
    clase: "border-warning/40 bg-warning/10 text-warning",
    Icono: MessageCircleQuestion,
  },
};

/** Estado cualitativo de suficiencia. No representa puntaje ni porcentaje. */
export function BadgeSuficiencia({ estado }: { estado: EstadoSuficiencia }) {
  const { clase, Icono } = estilos[estado];
  return (
    <Badge variant="outline" className={`gap-1.5 font-medium ${clase}`}>
      <Icono className="h-3.5 w-3.5" aria-hidden="true" />
      {etiquetaSuficiencia(estado)}
    </Badge>
  );
}
