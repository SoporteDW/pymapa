import { Check, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EstadoGuardado } from "@/lib/diagnostico/tipos";

interface IndicadorGuardadoProps {
  estado: EstadoGuardado;
  onReintentar?: () => void;
}

/**
 * Indicador discreto de guardado (POC-03, sección 13).
 * Nunca bloquea la interacción y ofrece reintento si la persistencia falla.
 */
export function IndicadorGuardado({ estado, onReintentar }: IndicadorGuardadoProps) {
  if (estado === "idle") return null;

  if (estado === "error") {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning-foreground"
      >
        <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">
          No pudimos guardar en este navegador. Tus respuestas siguen disponibles en esta sesión.
        </span>
        {onReintentar && (
          <Button variant="outline" size="sm" onClick={onReintentar}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
        )}
      </div>
    );
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      {estado === "saving" ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Guardando…
        </>
      ) : (
        <>
          <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          Guardado
        </>
      )}
    </p>
  );
}
