import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { DimensionResult } from "@/lib/diagnostico/tipos";

interface BarraDimensionProps {
  resultado: DimensionResult;
  destacada?: boolean;
}

/**
 * Barra horizontal por dimensión con valor numérico y etiqueta textual
 * (POC-03, sección 11). No incluye interpretaciones ni recomendaciones.
 */
export function BarraDimension({ resultado, destacada = false }: BarraDimensionProps) {
  return (
    <article
      className={cn(
        "space-y-3 rounded-xl border bg-card p-4",
        destacada ? "border-info/40 bg-info/5" : "border-border"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{resultado.nombre}</h3>
          <p className="text-xs text-muted-foreground">
            Nivel {resultado.level} · {resultado.answeredCount} de {resultado.totalCount} preguntas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {destacada && <Badge variant="secondary">Área para profundizar</Badge>}
          <span className="text-lg font-semibold tabular-nums text-foreground">
            {resultado.displayedScore.toFixed(1)}
          </span>
        </div>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={resultado.displayedScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${resultado.nombre}: ${resultado.displayedScore.toFixed(1)} de 100, nivel ${resultado.level}`}
      >
        <div
          className={cn("h-full rounded-full", destacada ? "bg-info" : "bg-primary")}
          style={{ width: `${Math.max(2, resultado.displayedScore)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{resultado.mensajeNivel}</p>
    </article>
  );
}
