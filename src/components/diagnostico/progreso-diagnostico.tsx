import { Progress } from "@/components/ui/progress";

interface ProgresoDiagnosticoProps {
  respondidas: number;
  total: number;
  porcentaje: number;
  seccion?: string;
}

/**
 * Barra de progreso del instrumento (R-NAV-04): preguntas obligatorias
 * respondidas sobre el total, con texto y porcentaje accesibles.
 */
export function ProgresoDiagnostico({
  respondidas,
  total,
  porcentaje,
  seccion,
}: ProgresoDiagnosticoProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{seccion ?? "Avance del diagnóstico"}</span>
        <span className="text-muted-foreground">
          {respondidas} de {total} preguntas · {porcentaje}%
        </span>
      </div>
      <Progress
        value={porcentaje}
        aria-label={`Avance del diagnóstico: ${respondidas} de ${total} preguntas respondidas, ${porcentaje} por ciento`}
      />
    </div>
  );
}
